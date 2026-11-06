import { NextResponse } from "next/server";

export type EWalletReportEntry = {
  id: string;
  date: string;
  category: string;
  summary: string;
  reporterLabel: string;
};

export type EWalletCheckResponse = {
  status: "dilaporkan" | "waspada" | "belum-dilaporkan";
  riskScore: number;
  accountType: "ewallet" | "bank";
  provider: string;
  rawNumber: string;
  normalizedNumber: string;
  maskedDisplay: string;
  operatorInfo: string;
  reportCount: number;
  lastReportedAt: string | null;
  reports: EWalletReportEntry[];
  riskReasons: string[];
  safetyTips: string[];
  officialVerifyUrl: string;
  officialReportUrl: string;
  aduanNomorUrl: string;
  source: "kominfo-mirror-api" | "kominfo-mirror-db";
  checkedAt: string;
};

type MirrorRecord = {
  normalizedNumber: string;
  provider?: string;
  accountType: "ewallet" | "bank";
  reportCount: number;
  lastReportedAt: string;
  reports: EWalletReportEntry[];
};

const SEEDED_REPORTED_ACCOUNTS: MirrorRecord[] = [
  {
    normalizedNumber: "081299887766",
    provider: "DANA",
    accountType: "ewallet",
    reportCount: 14,
    lastReportedAt: "2026-10-29",
    reports: [
      {
        id: "kom-101",
        date: "29 Okt 2026",
        category: "Penipuan Jual Beli Online",
        summary:
          "Pelaku meminta transfer saldo DANA untuk pembayaran barang elektronik di media sosial namun nomor pembeli langsung diblokir setelah dana masuk.",
        reporterLabel: "Laporan Terverifikasi #CR-8821",
      },
      {
        id: "kom-102",
        date: "14 Okt 2026",
        category: "Modus Tebus Hadiah / Biaya Admin",
        summary:
          "Digunakan sebagai akun penampung biaya administrasi klaim giveaway palsu via WhatsApp.",
        reporterLabel: "Laporan Komunitas #CR-8410",
      },
    ],
  },
  {
    normalizedNumber: "085711223344",
    provider: "GOPAY",
    accountType: "ewallet",
    reportCount: 8,
    lastReportedAt: "2026-10-25",
    reports: [
      {
        id: "kom-103",
        date: "25 Okt 2026",
        category: "Modus Kurir & Talangan Paket",
        summary:
          "Meminta transfer GoPay dengan alasan biaya tebusan resi paket yang tertahan di bea cukai/gudang.",
        reporterLabel: "Laporan Terverifikasi #CR-7904",
      },
    ],
  },
  {
    normalizedNumber: "089655443322",
    provider: "OVO",
    accountType: "ewallet",
    reportCount: 6,
    lastReportedAt: "2026-10-18",
    reports: [
      {
        id: "kom-104",
        date: "18 Okt 2026",
        category: "Investasi / Tugas Paruh Waktu Fiktif",
        summary:
          "Menampung deposit misi top-up berhadiah komisi di grup Telegram yang tidak pernah bisa dicairkan.",
        reporterLabel: "Laporan Komunitas #CR-7512",
      },
    ],
  },
  {
    normalizedNumber: "082188776655",
    provider: "SHOPEEPAY",
    accountType: "ewallet",
    reportCount: 5,
    lastReportedAt: "2026-10-12",
    reports: [
      {
        id: "kom-105",
        date: "12 Okt 2026",
        category: "Social Engineering / Phishing OTP",
        summary:
          "Pelaku menyamar sebagai CS resmi dan mengarahkan korban melakukan top-up ShopeePay ke nomor ini.",
        reporterLabel: "Laporan Terverifikasi #CR-7199",
      },
    ],
  },
  {
    normalizedNumber: "7120998811",
    provider: "BCA",
    accountType: "bank",
    reportCount: 11,
    lastReportedAt: "2026-10-27",
    reports: [
      {
        id: "kom-106",
        date: "27 Okt 2026",
        category: "Penipuan Marketplace / Rekening Bersama Palsu",
        summary:
          "Dilaporkan menerima dana transaksi jual beli fiktif dengan bukti resi pengiriman palsu.",
        reporterLabel: "Laporan Terverifikasi #CR-8605",
      },
    ],
  },
];

// In-memory runtime store for user-submitted mirror reports
const runtimeReports: MirrorRecord[] = [...SEEDED_REPORTED_ACCOUNTS];

function normalizeAccountNumber(raw: string, accountType: "ewallet" | "bank"): string {
  let digits = String(raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+62")) {
    digits = "0" + digits.slice(3);
  } else if (digits.startsWith("628")) {
    digits = "0" + digits.slice(2);
  }
  digits = digits.replace(/\D/g, "");

  // Strip common virtual account prefixes for E-Wallet top-up numbers if user pasted full VA
  if (accountType === "ewallet" && digits.length > 13) {
    const vaPrefixes = ["3901", "70001", "88810", "89508", "8810", "8528", "8099", "122"];
    for (const prefix of vaPrefixes) {
      if (digits.startsWith(prefix) && digits.slice(prefix.length).startsWith("08")) {
        digits = digits.slice(prefix.length);
        break;
      }
    }
  }
  return digits;
}

function detectIndonesianOperator(normalized: string, accountType: "ewallet" | "bank"): string {
  if (accountType === "bank") {
    return `Nomor Rekening Bank (${normalized.length} digit)`;
  }
  if (!normalized.startsWith("08")) {
    return "Format Nomor Non-Seluler / Virtual Account";
  }
  const p4 = normalized.slice(0, 4);
  if (["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"].includes(p4)) {
    return "Telkomsel (Simpati / Halo / Kartu AS / by.U)";
  }
  if (["0814", "0815", "0816", "0855", "0856", "0857", "0858"].includes(p4)) {
    return "Indosat Ooredoo Hutchison (IM3 / Mentari)";
  }
  if (["0817", "0818", "0819", "0859", "0877", "0878"].includes(p4)) {
    return "XL Axiata";
  }
  if (["0831", "0832", "0833", "0838"].includes(p4)) {
    return "AXIS (XL Axiata)";
  }
  if (["0895", "0896", "0897", "0898", "0899"].includes(p4)) {
    return "Tri (3 Indonesia / Indosat)";
  }
  if (["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"].includes(p4)) {
    return "Smartfren";
  }
  return "Prefix Seluler Indonesia Lainnya";
}

function formatMaskedDisplay(normalized: string): string {
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8)}`;
}

async function queryExternalCekRekeningMirror(
  accountType: "ewallet" | "bank",
  provider: string,
  normalizedNumber: string
): Promise<Partial<EWalletCheckResponse> | null> {
  const apiUrl = (process.env.CEKREKENING_API_URL || "").trim();
  const apiKey = (process.env.CEKREKENING_API_KEY || "").trim();

  if (!apiUrl || apiUrl.startsWith("ISI_")) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey && !apiKey.startsWith("ISI_")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
      headers["x-api-key"] = apiKey;
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accountType,
        provider,
        accountNumber: normalizedNumber,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;

    const reported =
      Boolean(data.reported) ||
      data.status === "dilaporkan" ||
      Number(data.reportCount) > 0;

    return {
      status: reported ? "dilaporkan" : "belum-dilaporkan",
      riskScore: reported ? 92 : 14,
      reportCount: Number(data.reportCount) || (reported ? 1 : 0),
      lastReportedAt: data.lastReportedAt || (reported ? new Date().toISOString().slice(0, 10) : null),
      reports: Array.isArray(data.reports) ? data.reports : [],
      source: "kominfo-mirror-api",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action === "report" ? "report" : "check";
    const accountType: "ewallet" | "bank" =
      body?.accountType === "bank" ? "bank" : "ewallet";
    const provider = String(body?.provider || "DANA")
      .trim()
      .toUpperCase();
    const rawNumber = String(body?.accountNumber || "").trim();
    const chronology = String(body?.chronology || "").trim();
    const category = String(
      body?.category || "Penipuan Transaksi Digital / E-Wallet"
    ).trim();

    const normalizedNumber = normalizeAccountNumber(rawNumber, accountType);

    if (!normalizedNumber || normalizedNumber.length < 8 || normalizedNumber.length > 18) {
      return NextResponse.json(
        {
          error:
            accountType === "ewallet"
              ? "Masukkan nomor ponsel E-Wallet yang valid (8 hingga 15 digit, contoh: 081299887766)."
              : "Masukkan nomor rekening bank yang valid (8 hingga 18 digit).",
        },
        { status: 400 }
      );
    }

    if (action === "report") {
      if (!chronology || chronology.length < 10) {
        return NextResponse.json(
          {
            error:
              "Tuliskan kronologi singkat laporan minimal 10 karakter agar dapat dicatat.",
          },
          { status: 400 }
        );
      }

      const existing = runtimeReports.find(
        (item) => item.normalizedNumber === normalizedNumber
      );

      const newEntry: EWalletReportEntry = {
        id: `rep-${Date.now().toString(36)}`,
        date: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        category,
        summary: chronology.slice(0, 400),
        reporterLabel: `Laporan Pengguna SADAR #${Math.floor(1000 + Math.random() * 9000)}`,
      };

      if (existing) {
        existing.reportCount += 1;
        existing.lastReportedAt = new Date().toISOString().slice(0, 10);
        existing.reports = [newEntry, ...existing.reports].slice(0, 8);
      } else {
        runtimeReports.unshift({
          normalizedNumber,
          provider,
          accountType,
          reportCount: 1,
          lastReportedAt: new Date().toISOString().slice(0, 10),
          reports: [newEntry],
        });
      }
    }

    const operatorInfo = detectIndonesianOperator(normalizedNumber, accountType);

    // 1. Check external mirror API if configured
    const externalResult = await queryExternalCekRekeningMirror(
      accountType,
      provider,
      normalizedNumber
    );

    // 2. Check internal mirror database
    const matchedRecord = runtimeReports.find(
      (item) => item.normalizedNumber === normalizedNumber
    );

    const hasSuspiciousChronology =
      chronology.length > 0 &&
      /(otp|pin|apk|undian|hadiah|kurir|tertahan|tebus|admin|blokir|komisi|telegram)/i.test(
        chronology
      );

    const isInvalidPrefix =
      accountType === "ewallet" &&
      (!normalizedNumber.startsWith("08") ||
        operatorInfo.includes("Non-Seluler") ||
        operatorInfo.includes("Lainnya"));

    if (externalResult?.status === "dilaporkan" || matchedRecord) {
      const reportCount =
        externalResult?.reportCount || matchedRecord?.reportCount || 1;
      const reports =
        (externalResult?.reports && externalResult.reports.length > 0
          ? externalResult.reports
          : matchedRecord?.reports) || [];

      const responsePayload: EWalletCheckResponse = {
        status: "dilaporkan",
        riskScore: Math.min(99, 78 + reportCount * 2),
        accountType,
        provider,
        rawNumber,
        normalizedNumber,
        maskedDisplay: formatMaskedDisplay(normalizedNumber),
        operatorInfo,
        reportCount,
        lastReportedAt:
          externalResult?.lastReportedAt ||
          matchedRecord?.lastReportedAt ||
          new Date().toISOString().slice(0, 10),
        reports,
        riskReasons: [
          `PERINGATAN: Nomor ${provider} (${formatMaskedDisplay(
            normalizedNumber
          )}) tercatat memiliki ${reportCount} laporan indikasi penipuan pada database Mirror CekRekening.`,
          "Nomor ini pernah dilaporkan masyarakat terkait transaksi mencurigakan atau rekayasa sosial.",
          "Tahan seluruh rencana transfer dana atau pembayaran ke nomor akun ini.",
        ],
        safetyTips: [
          "Batalkan transaksi segera dan jangan kirim bukti transfer atau kode OTP apa pun.",
          "Jika Anda sudah telanjur mentransfer dana, segera hubungi Call Center resmi penyedia E-Wallet/Bank dan buat laporan resmi di CekRekening.id & IASC OJK (iasc.ojk.go.id).",
        ],
        officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
        officialReportUrl: "https://cekrekening.id/laporkan-rekening",
        aduanNomorUrl: "https://aduannomor.id",
        source: externalResult ? "kominfo-mirror-api" : "kominfo-mirror-db",
        checkedAt: new Date().toISOString(),
      };
      return NextResponse.json(responsePayload);
    }

    if (hasSuspiciousChronology || isInvalidPrefix) {
      const riskReasons: string[] = [];
      if (hasSuspiciousChronology) {
        riskReasons.push(
          "Meskipun nomor belum tercatat di daftar hitam, konteks/kronologi yang Anda masukkan mengandung pola modus penipuan berisiko tinggi (tebusan admin, hadiah, kurir .apk, atau misi komisi)."
        );
      }
      if (isInvalidPrefix) {
        riskReasons.push(
          `Format nomor (${normalizedNumber}) tidak sesuai dengan prefix standar operator seluler E-Wallet Indonesia.`
        );
      }
      riskReasons.push(
        "Pelaku kejahatan siber sering mengganti nomor E-Wallet baru yang belum pernah dilaporkan sebelumnya."
      );

      const responsePayload: EWalletCheckResponse = {
        status: "waspada",
        riskScore: 58,
        accountType,
        provider,
        rawNumber,
        normalizedNumber,
        maskedDisplay: formatMaskedDisplay(normalizedNumber),
        operatorInfo,
        reportCount: 0,
        lastReportedAt: null,
        reports: [],
        riskReasons,
        safetyTips: [
          "Gunakan rekening bersama (escrow) atau marketplace resmi jika berbelanja online.",
          "Lakukan pengecekan silang langsung di portal resmi CekRekening.id milik Kemkomdigi (Kominfo).",
        ],
        officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
        officialReportUrl: "https://cekrekening.id/laporkan-rekening",
        aduanNomorUrl: "https://aduannomor.id",
        source: externalResult ? "kominfo-mirror-api" : "kominfo-mirror-db",
        checkedAt: new Date().toISOString(),
      };
      return NextResponse.json(responsePayload);
    }

    const safePayload: EWalletCheckResponse = {
      status: "belum-dilaporkan",
      riskScore: 12,
      accountType,
      provider,
      rawNumber,
      normalizedNumber,
      maskedDisplay: formatMaskedDisplay(normalizedNumber),
      operatorInfo,
      reportCount: 0,
      lastReportedAt: null,
      reports: [],
      riskReasons: [
        `Nomor ${provider} (${formatMaskedDisplay(
          normalizedNumber
        )}) belum pernah dilaporkan dalam database Mirror CekRekening saat ini.`,
        `Teridentifikasi menggunakan jaringan ${operatorInfo}.`,
        "Catatan Penting Kominfo: Status 'Belum Pernah Dilaporkan' bukan jaminan 100% aman apabila Anda bertransaksi di luar aplikasi resmi.",
      ],
      safetyTips: [
        "Pastikan nama pemilik akun E-Wallet/Rekening yang muncul saat konfirmasi transfer sesuai dengan identitas penjual resmi.",
        "Jangan pernah mentransfer uang karena diancam blokir, diminta biaya tebusan hadiah, atau ditekan waktu.",
      ],
      officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
      officialReportUrl: "https://cekrekening.id/laporkan-rekening",
      aduanNomorUrl: "https://aduannomor.id",
      source: externalResult ? "kominfo-mirror-api" : "kominfo-mirror-db",
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(safePayload);
  } catch {
    return NextResponse.json(
      { error: "Gagal memeriksa nomor E-Wallet / Rekening saat ini." },
      { status: 400 }
    );
  }
}
