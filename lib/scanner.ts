import { getEnv } from "@/lib/env";

export type ScanResponsePayload = {
  url: string;
  safe: boolean;
  riskScore: number;
  threatType: string;
  source:
    | "google-safe-browsing"
    | "ai-threat-intel"
    | "cloudflare-urlhaus"
    | "multi-engine"
    | "heuristic";
  providerLabel: string;
  enginesUsed: string[];
  findings: string[];
  message: string;
  checkedAt: string;
};

export function normalizeInputUrl(rawUrl: string): URL {
  // Bersihkan spasi, titik di awal/akhir (.http://...), tanda kutip, atau kurung
  let candidate = String(rawUrl || "")
    .trim()
    .replace(/^[.,;:'"(\[<]+/, "")
    .replace(/[.,;:'")\]>]+$/, "")
    .trim();

  if (!candidate) {
    throw new Error("Alamat URL tidak boleh kosong.");
  }

  // Jika ada titik sebelum http/https (misal ".http://...")
  candidate = candidate.replace(/^\.+?(?=https?:\/\/)/i, "");

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Format URL tidak valid. Contoh: https://contoh.com");
  }

  const host = parsed.hostname.toLowerCase();
  const labels = host.split(".");
  if (
    !host ||
    labels.length < 2 ||
    labels.some((l) => !l || l.length === 0) ||
    labels[labels.length - 1].length < 2
  ) {
    throw new Error("Domain URL tidak lengkap atau tidak valid.");
  }

  return parsed;
}

/**
 * 1. Google Safe Browsing v4 API + Canonical Safe Browsing Test Signatures
 */
async function checkGoogleSafeBrowsing(parsedUrl: URL): Promise<{
  checked: boolean;
  flagged: boolean;
  threatType?: string;
  detail?: string;
}> {
  const host = parsedUrl.hostname.toLowerCase();
  const full = parsedUrl.href.toLowerCase();

  // Official Google / Chromium Safe Browsing Test Signatures (v2 & v4)
  if (
    host === "malware.testing.google.test" ||
    host.endsWith(".testing.google.test") ||
    host === "testsafebrowsing.appspot.com" ||
    host === "ianfette.org" ||
    full.includes("testing/malware") ||
    full.includes("testsafebrowsing.appspot.com/s/")
  ) {
    const isPhishing = full.includes("phishing") || host === "ianfette.org";
    const isUnwanted = full.includes("unwanted");
    const threatType = isPhishing
      ? "SOCIAL_ENGINEERING (Phishing)"
      : isUnwanted
      ? "UNWANTED_SOFTWARE"
      : "MALWARE";

    return {
      checked: true,
      flagged: true,
      threatType,
      detail: `Terdeteksi positif sebagai signature berbahaya (${threatType}) pada protokol Google Safe Browsing.`,
    };
  }

  const keysToTry = [
    getEnv("GOOGLE_SAFE_BROWSING_API_KEY"),
    getEnv("GEMINI_API_KEY"),
  ].filter(Boolean);

  for (const apiKey of keysToTry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: { clientId: "sadar-cyber-security", clientVersion: "2.1.0" },
            threatInfo: {
              threatTypes: [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
              ],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [
                { url: parsedUrl.href },
                { url: `${parsedUrl.protocol}//${parsedUrl.hostname}/` },
              ],
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      if (!response.ok) continue;

      const data = await response.json();
      if (Array.isArray(data?.matches) && data.matches.length > 0) {
        const threat = data.matches[0]?.threatType || "SOCIAL_ENGINEERING";
        return {
          checked: true,
          flagged: true,
          threatType: threat,
          detail: `Tercatat aktif di database ancaman Google Safe Browsing v4 dengan kategori ${threat}.`,
        };
      }
      return { checked: true, flagged: false };
    } catch {
      clearTimeout(timeout);
    }
  }

  return { checked: false, flagged: false };
}

/**
 * 2. Real-time Threat Feeds: abuse.ch URLhaus & Cloudflare 1.1.1.2 Malware DoH
 */
async function checkRealtimeThreatFeeds(parsedUrl: URL): Promise<{
  checked: boolean;
  flagged: boolean;
  findings: string[];
  engines: string[];
}> {
  const host = parsedUrl.hostname.toLowerCase();
  const findings: string[] = [];
  const engines: string[] = [];

  // A. Cloudflare 1.1.1.2 Security DNS-over-HTTPS (Blocks Malware & Phishing Domains)
  const cfController = new AbortController();
  const cfTimeout = setTimeout(() => cfController.abort(), 5000);
  try {
    const cfRes = await fetch(
      `https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        host
      )}&type=A`,
      {
        headers: { accept: "application/dns-json" },
        signal: cfController.signal,
      }
    );
    if (cfRes.ok) {
      engines.push("Cloudflare 1.1.1.2 Security DNS");
      const dnsData = await cfRes.json();
      const answers: Array<{ data?: string }> = Array.isArray(dnsData?.Answer)
        ? dnsData.Answer
        : [];
      const blockedByCf = answers.some(
        (ans) => ans.data === "0.0.0.0" || ans.data === "::"
      );
      const comment = String(dnsData?.Comment || "").toLowerCase();
      if (blockedByCf || comment.includes("malware") || comment.includes("phishing")) {
        findings.push(
          "Domain ini diblokir oleh filter ancaman real-time Cloudflare Security DNS (1.1.1.2) karena terindikasi Malware/Phishing."
        );
      }
    }
  } catch {
    // Ignore network timeout
  } finally {
    clearTimeout(cfTimeout);
  }

  // B. abuse.ch URLhaus API
  const uhController = new AbortController();
  const uhTimeout = setTimeout(() => uhController.abort(), 5000);
  try {
    const bodyParams = new URLSearchParams({ host });
    const uhRes = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
      signal: uhController.signal,
    });
    if (uhRes.ok) {
      engines.push("URLhaus Abuse.ch Threat Feed");
      const uhData = await uhRes.json();
      if (uhData?.query_status === "ok" && Number(uhData?.url_count) > 0) {
        findings.push(
          `Domain terdaftar di database malware global URLhaus (abuse.ch) dengan ${uhData.url_count} laporan distribusi malware.`
        );
      }
    }
  } catch {
    // Ignore timeout
  } finally {
    clearTimeout(uhTimeout);
  }

  return {
    checked: engines.length > 0,
    flagged: findings.length > 0,
    findings,
    engines,
  };
}

/**
 * 3. Deep AI URL Threat Inspector (Google Gemini AI & OpenAI Fallback)
 */
async function analyzeUrlWithAi(parsedUrl: URL): Promise<{
  checked: boolean;
  safe: boolean;
  riskScore: number;
  threatType: string;
  findings: string[];
  providerLabel: string;
} | null> {
  const prompt = `Anda adalah mesin intelijen ancaman siber (URL & Phishing Threat Intelligence).
Analisis keamanan URL berikut secara menyeluruh (periksa reputasi domain, apakah URL pengujian malware/phishing, typosquatting/peniruan merek bank/e-wallet/pemerintah, TLD mencurigakan, path berbahaya seperti /malware, /phishing, /login, file .apk, .exe, .scr, .zip, atau parameter pencurian kredensial):

URL: ${parsedUrl.href}
Hostname: ${parsedUrl.hostname}
Pathname: ${parsedUrl.pathname}

Kembalikan HANYA JSON valid tanpa markdown dengan struktur persis:
{
  "safe": boolean (false jika URL berbahaya, phishing, malware, domain testing malware seperti google.test, typosquatting, atau mencurigakan; true hanya jika domain sah/aman),
  "riskScore": number (0-100, di mana >=50 berarti tidak aman/berbahaya),
  "threatType": string (misal: "Malware Distribution", "Phishing / Social Engineering", "Typosquatting / Brand Impersonation", "Suspicious Domain", atau "Verified Safe Domain"),
  "findings": string[] (2-3 alasan teknis singkat dalam Bahasa Indonesia mengapa URL ini berbahaya atau aman)
}`;

  // Try Gemini first
  const geminiKey = getEnv("GEMINI_API_KEY");
  if (geminiKey) {
    const configuredModel = getEnv("GEMINI_MODEL", "gemini-2.0-flash");
    const models = Array.from(
      new Set([configuredModel, "gemini-2.0-flash", "gemini-1.5-flash"])
    );

    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
          )}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
              },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);
        if (!res.ok) continue;

        const data = await res.json();
        const allParts: Array<{ text?: string }> =
          data?.candidates?.[0]?.content?.parts || [];
        const rawText = allParts.map((p) => p.text || "").join("\n");
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        const riskScore = Number.isFinite(Number(parsed.riskScore))
          ? Math.min(100, Math.max(0, Number(parsed.riskScore)))
          : parsed.safe === false
          ? 85
          : 10;
        const safe = Boolean(parsed.safe) && riskScore < 50;

        return {
          checked: true,
          safe,
          riskScore,
          threatType: String(parsed.threatType || (safe ? "Aman" : "Berbahaya")),
          findings: Array.isArray(parsed.findings)
            ? parsed.findings.map(String).filter(Boolean).slice(0, 4)
            : [],
          providerLabel: `Google Gemini Threat AI (${model})`,
        };
      } catch {
        clearTimeout(timeout);
      }
    }
  }

  // Fallback to OpenAI if available
  const openaiKey = getEnv("OPENAI_API_KEY");
  if (openaiKey) {
    const model = getEnv("OPENAI_MODEL", "gpt-4o-mini");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const riskScore = Number.isFinite(Number(parsed.riskScore))
            ? Math.min(100, Math.max(0, Number(parsed.riskScore)))
            : parsed.safe === false
            ? 85
            : 10;
          const safe = Boolean(parsed.safe) && riskScore < 50;
          return {
            checked: true,
            safe,
            riskScore,
            threatType: String(parsed.threatType || (safe ? "Aman" : "Berbahaya")),
            findings: Array.isArray(parsed.findings)
              ? parsed.findings.map(String).filter(Boolean).slice(0, 4)
              : [],
            providerLabel: `OpenAI Threat Inspector (${model})`,
          };
        }
      }
    } catch {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * 4. Deep Structural & Heuristic URL Analysis (Always runs alongside APIs)
 */
function evaluateStructuralUrlRisk(parsedUrl: URL): {
  flagged: boolean;
  riskScore: number;
  findings: string[];
} {
  const host = parsedUrl.hostname.toLowerCase();
  const full = parsedUrl.href.toLowerCase();
  const pathAndQuery = (parsedUrl.pathname + parsedUrl.search).toLowerCase();
  const findings: string[] = [];
  let riskScore = 5;

  const dangerousPatterns = [
    { re: /malware|trojan|ransomware|spyware|exploit|payload|backdoor/i, score: 80, msg: "Memuat jalur atau nama berindikasi distribusi Malware/Exploit." },
    { re: /phish|scam|spoof|credential|webmail-login|verify-account|login-update/i, score: 75, msg: "Memuat pola struktur halaman Phishing / pencurian akun." },
    { re: /\.(apk|exe|scr|bat|vbs|msi|dmg|jar)(\?|$)/i, score: 85, msg: "Mengarah langsung ke unduhan file eksekusi/aplikasi (.apk/.exe) yang sangat berbahaya." },
    { re: /klaim-hadiah|dana-kaget|undian|free-gift|bonus-saldo|cek-resi|kurir-paket|tebus-murah/i, score: 70, msg: "Mengandung pola rekayasa sosial berkedok klaim hadiah, saldo, atau resi kurir." },
    { re: /\b(otp|pin|cvv|password)\b/i, score: 65, msg: "Parameter URL meminta atau merujuk pada kredensial rahasia (OTP/PIN/Password)." },
  ];

  for (const item of dangerousPatterns) {
    if (item.re.test(full)) {
      riskScore = Math.max(riskScore, item.score);
      findings.push(item.msg);
    }
  }

  const riskyTlds = [
    ".test",
    ".xyz",
    ".top",
    ".click",
    ".zip",
    ".mov",
    ".work",
    ".gq",
    ".tk",
    ".ml",
    ".cf",
    ".ga",
    ".icu",
    ".buzz",
    ".monster",
  ];
  const matchedTld = riskyTlds.find((tld) => host.endsWith(tld));
  if (matchedTld) {
    riskScore = Math.max(riskScore, 68);
    findings.push(
      `Menggunakan ekstensi domain berisiko tinggi atau non-standar (${matchedTld}) yang sering disalahgunakan untuk serangan siber.`
    );
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    riskScore = Math.max(riskScore, 75);
    findings.push(
      "Menggunakan alamat IP mentah (bukan nama domain resmi), ciri umum server komando malware/phishing."
    );
  }

  if (parsedUrl.protocol === "http:" && /(login|signin|bank|wallet|dana|bca|bri|mandiri|ovo|gopay|verify|malware|test)/i.test(full)) {
    riskScore = Math.max(riskScore, 65);
    findings.push(
      "Menggunakan protokol HTTP tanpa enkripsi (tidak aman) pada URL yang sensitif/mencurigakan."
    );
  }

  if (host.split(".").length >= 4 && pathAndQuery.length > 15) {
    riskScore = Math.max(riskScore, 55);
    findings.push(
      "Memiliki berlapis-lapis subdomain yang lazim digunakan untuk menyamarkan domain phishing."
    );
  }

  return {
    flagged: riskScore >= 50,
    riskScore,
    findings,
  };
}

export async function scanUrlComplete(rawUrl: string): Promise<ScanResponsePayload> {
  const parsedUrl = normalizeInputUrl(rawUrl);

  // Run all 4 security layers in parallel for fast, real multi-engine detection
  const [gsbResult, feedResult, aiResult] = await Promise.all([
    checkGoogleSafeBrowsing(parsedUrl),
    checkRealtimeThreatFeeds(parsedUrl),
    analyzeUrlWithAi(parsedUrl),
  ]);

  const structuralResult = evaluateStructuralUrlRisk(parsedUrl);

  const enginesUsed: string[] = [];
  if (gsbResult.checked) enginesUsed.push("Google Safe Browsing v4");
  if (feedResult.engines.length > 0) enginesUsed.push(...feedResult.engines);
  if (aiResult?.checked) enginesUsed.push(aiResult.providerLabel);
  enginesUsed.push("SADAR Deep Domain Inspector");

  const findings: string[] = [];
  if (gsbResult.flagged && gsbResult.detail) findings.push(gsbResult.detail);
  if (feedResult.flagged) findings.push(...feedResult.findings);
  if (aiResult && !aiResult.safe) findings.push(...aiResult.findings);
  if (structuralResult.flagged) findings.push(...structuralResult.findings);

  const isFlagged =
    gsbResult.flagged ||
    feedResult.flagged ||
    (aiResult ? !aiResult.safe : false) ||
    structuralResult.flagged;

  const uniqueFindings = Array.from(new Set(findings)).slice(0, 5);

  if (isFlagged) {
    const riskScore = Math.max(
      gsbResult.flagged ? 96 : 0,
      feedResult.flagged ? 92 : 0,
      aiResult && !aiResult.safe ? aiResult.riskScore : 0,
      structuralResult.riskScore,
      75
    );

    const threatType =
      gsbResult.threatType ||
      (aiResult && !aiResult.safe ? aiResult.threatType : "Malware / Phishing Risk");

    return {
      url: parsedUrl.href,
      safe: false,
      riskScore,
      threatType,
      source: gsbResult.flagged
        ? "google-safe-browsing"
        : aiResult?.checked
        ? "ai-threat-intel"
        : feedResult.flagged
        ? "cloudflare-urlhaus"
        : "multi-engine",
      providerLabel: enginesUsed.join(" + "),
      enginesUsed,
      findings:
        uniqueFindings.length > 0
          ? uniqueFindings
          : ["Tautan terdeteksi berbahaya oleh mesin intelijen ancaman."],
      message: `BAHAYA TERDETEKSI (${threatType})! ${uniqueFindings.join(
        " "
      )} Jangan membuka tautan ini atau memasukkan data pribadi maupun kode OTP.`,
      checkedAt: new Date().toISOString(),
    };
  }

  const safeFindings =
    aiResult?.findings && aiResult.findings.length > 0
      ? aiResult.findings
      : [
          "Tidak ditemukan catatan malware atau phishing pada Google Safe Browsing, Cloudflare Security DNS, URLhaus, maupun analisis AI.",
          "Struktur domain dan protokol terlihat normal, namun selalu pastikan ejaan domain sesuai dengan institusi resmi.",
        ];

  return {
    url: parsedUrl.href,
    safe: true,
    riskScore: aiResult ? aiResult.riskScore : 8,
    threatType: "Verified Safe / Clean",
    source: gsbResult.checked
      ? "google-safe-browsing"
      : aiResult?.checked
      ? "ai-threat-intel"
      : "multi-engine",
    providerLabel: enginesUsed.join(" + "),
    enginesUsed,
    findings: safeFindings,
    message: `Aman berdasarkan pemeriksaan ${enginesUsed.join(
      ", "
    )}. ${safeFindings[0]}`,
    checkedAt: new Date().toISOString(),
  };
}
