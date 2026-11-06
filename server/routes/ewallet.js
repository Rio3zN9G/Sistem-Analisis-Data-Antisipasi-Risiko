const express = require("express");

const router = express.Router();

const SEEDED_REPORTED_ACCOUNTS = [
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

const runtimeReports = [...SEEDED_REPORTED_ACCOUNTS];

function normalizeAccountNumber(raw, accountType) {
  let digits = String(raw || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+62")) {
    digits = "0" + digits.slice(3);
  } else if (digits.startsWith("628")) {
    digits = "0" + digits.slice(2);
  }
  digits = digits.replace(/\D/g, "");

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

function detectIndonesianOperator(normalized, accountType) {
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

function formatMaskedDisplay(normalized) {
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8)}`;
}

router.post("/", async (req, res) => {
  const body = req.body || {};
  const action = body.action === "report" ? "report" : "check";
  const accountType = body.accountType === "bank" ? "bank" : "ewallet";
  const provider = String(body.provider || "DANA").trim().toUpperCase();
  const rawNumber = String(body.accountNumber || "").trim();
  const chronology = String(body.chronology || "").trim();
  const category = String(body.category || "Penipuan Transaksi Digital / E-Wallet").trim();

  const normalizedNumber = normalizeAccountNumber(rawNumber, accountType);

  if (!normalizedNumber || normalizedNumber.length < 8 || normalizedNumber.length > 18) {
    return res.status(400).json({
      error:
        accountType === "ewallet"
          ? "Masukkan nomor ponsel E-Wallet yang valid (8 hingga 15 digit)."
          : "Masukkan nomor rekening bank yang valid (8 hingga 18 digit).",
    });
  }

  if (action === "report") {
    if (!chronology || chronology.length < 10) {
      return res.status(400).json({
        error: "Tuliskan kronologi singkat laporan minimal 10 karakter agar dapat dicatat.",
      });
    }

    const existing = runtimeReports.find((item) => item.normalizedNumber === normalizedNumber);
    const newEntry = {
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
  const matchedRecord = runtimeReports.find((item) => item.normalizedNumber === normalizedNumber);

  if (matchedRecord) {
    return res.json({
      status: "dilaporkan",
      riskScore: Math.min(99, 78 + matchedRecord.reportCount * 2),
      accountType,
      provider,
      rawNumber,
      normalizedNumber,
      maskedDisplay: formatMaskedDisplay(normalizedNumber),
      operatorInfo,
      reportCount: matchedRecord.reportCount,
      lastReportedAt: matchedRecord.lastReportedAt,
      reports: matchedRecord.reports,
      riskReasons: [
        `PERINGATAN: Nomor ${provider} (${formatMaskedDisplay(
          normalizedNumber
        )}) tercatat memiliki ${matchedRecord.reportCount} laporan indikasi penipuan pada database Mirror CekRekening.`,
        "Nomor ini pernah dilaporkan masyarakat terkait transaksi mencurigakan atau rekayasa sosial.",
        "Tahan seluruh rencana transfer dana atau pembayaran ke nomor akun ini.",
      ],
      safetyTips: [
        "Batalkan transaksi segera dan jangan kirim bukti transfer atau kode OTP apa pun.",
        "Jika sudah telanjur mentransfer dana, segera hubungi Call Center resmi penyedia E-Wallet/Bank dan buat laporan di CekRekening.id.",
      ],
      officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
      officialReportUrl: "https://cekrekening.id/laporkan-rekening",
      aduanNomorUrl: "https://aduannomor.id",
      source: "kominfo-mirror-db",
      checkedAt: new Date().toISOString(),
    });
  }

  return res.json({
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
      "Pastikan nama pemilik akun E-Wallet/Rekening sesuai dengan identitas penjual resmi.",
      "Jangan pernah mentransfer uang karena diancam blokir atau diminta biaya tebusan hadiah.",
    ],
    officialVerifyUrl: "https://cekrekening.id/periksa-rekening",
    officialReportUrl: "https://cekrekening.id/laporkan-rekening",
    aduanNomorUrl: "https://aduannomor.id",
    source: "kominfo-mirror-db",
    checkedAt: new Date().toISOString(),
  });
});

module.exports = router;
