"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeading } from "@/components/Analyzer";
import { useStats } from "@/components/StatsContext";
import { Tilt3DCard } from "@/components/CyberMesh3D";

type Choice = {
  label: string;
  safe: boolean;
  outcome: string;
};

type Scenario = {
  id: string;
  category: string;
  title: string;
  story: string;
  question: string;
  choices: Choice[];
  recovery: string[];
  takeaway: string;
};

const scenarios: Scenario[] = [
  {
    id: "delivery-link",
    category: "TAUTAN MENCURIGAKAN",
    title: "Paket tertahan, diminta bayar biaya kecil",
    story:
      "Kamu menerima SMS yang mengaku dari layanan kurir. Pesan mendesakmu membuka tautan dan mengisi alamat serta data kartu.",
    question: "Apa langkah paling aman?",
    choices: [
      {
        label: "Buka tautan dan isi data agar paket cepat dikirim",
        safe: false,
        outcome:
          "Halaman tiruan bisa merekam data yang kamu masukkan. Biaya kecil juga dapat menjadi awal transaksi yang tidak kamu setujui.",
      },
      {
        label:
          "Cari status paket melalui aplikasi atau situs resmi yang dibuka sendiri",
        safe: true,
        outcome:
          "Bagus. Kamu memeriksa informasi lewat kanal yang tidak berasal dari pesan, tanpa memberikan data ke tautan yang belum diverifikasi.",
      },
      {
        label: "Balas pesan dengan alamat rumah dan nomor kartu",
        safe: false,
        outcome:
          "Membalas dapat membagikan data sensitif dan memberi pelaku bahan untuk menargetkanmu lagi.",
      },
    ],
    recovery: [
      "Tutup halaman dan jangan isi atau kirim data lebih lanjut.",
      "Jika data kartu sudah dimasukkan, hubungi bank melalui aplikasi atau nomor resmi untuk memblokir kartu dan meninjau transaksi.",
      "Jika kata sandi digunakan juga di layanan lain, ganti melalui aplikasi/situs resmi dan keluar dari sesi yang tidak dikenal.",
    ],
    takeaway:
      "Buka aplikasi atau ketik alamat situs resmi sendiri. Jangan mengandalkan tautan, nomor telepon, atau instruksi yang dikirim oleh pesan mencurigakan.",
  },
  {
    id: "otp-request",
    category: "PENCURIAN AKUN",
    title: "Orang yang mengaku CS meminta kode OTP",
    story:
      "Seseorang menghubungimu dan berkata akunmu akan diblokir. Ia meminta kode OTP yang baru saja masuk ke ponselmu.",
    question: "Bagaimana kamu merespons?",
    choices: [
      {
        label: "Kirim kode agar akun tidak diblokir",
        safe: false,
        outcome:
          "Kode OTP dapat mengizinkan orang lain masuk atau menyetujui tindakan pada akunmu. Petugas resmi tidak memerlukan kode rahasiamu.",
      },
      {
        label:
          "Jangan bagikan kode; hubungi dukungan lewat aplikasi atau situs resmi",
        safe: true,
        outcome:
          "Tepat. Kamu menjaga kode tetap rahasia dan memeriksa status akun melalui kanal yang kamu pilih sendiri.",
      },
      {
        label: "Klik tautan di pesan lalu masuk untuk membuktikan akun",
        safe: false,
        outcome:
          "Tautan tiruan dapat mencuri kata sandi dan kode yang kamu masukkan. Ancaman pemblokiran sering dipakai untuk membuat orang terburu-buru.",
      },
    ],
    recovery: [
      "Hubungi penyedia layanan melalui aplikasi/situs resmi dan amankan akun secepatnya.",
      "Ganti kata sandi dari perangkat tepercaya, cabut sesi/perangkat yang tidak dikenal, dan aktifkan autentikasi multifaktor.",
      "Jika akun keuangan atau pembayaran terlibat, hubungi bank melalui kanal resminya dan periksa transaksi.",
    ],
    takeaway:
      "OTP, PIN, kata sandi, dan kode pemulihan adalah rahasia. Jangan membagikannya kepada siapa pun, termasuk orang yang mengaku petugas.",
  },
  {
    id: "password-reuse",
    category: "KEAMANAN AKUN",
    title: "Satu kata sandi dipakai di banyak akun",
    story:
      "Sebuah situs yang pernah kamu gunakan mengumumkan kebocoran data. Kata sandi yang sama juga dipakai untuk email dan akun penting lainnya.",
    question: "Apa yang sebaiknya dilakukan lebih dulu?",
    choices: [
      {
        label: "Tunggu dulu karena belum melihat aktivitas aneh",
        safe: false,
        outcome:
          "Kredensial yang bocor dapat dicoba otomatis di layanan lain. Tidak adanya notifikasi bukan bukti bahwa akun masih aman.",
      },
      {
        label:
          "Ubah kata sandi akun penting menjadi unik melalui situs resmi",
        safe: true,
        outcome:
          "Bagus. Kata sandi unik membatasi dampak jika satu layanan mengalami kebocoran. Amankan email utama lebih dulu karena dapat dipakai untuk pemulihan akun lain.",
      },
      {
        label: "Kirim kata sandi ke orang yang menawarkan bantuan",
        safe: false,
        outcome:
          "Pihak lain yang mengetahui kata sandimu dapat mengambil alih akun. Dukungan resmi tidak perlu meminta kata sandi.",
      },
    ],
    recovery: [
      "Gunakan perangkat tepercaya dan buka layanan dengan mengetik alamat resminya sendiri.",
      "Ganti kata sandi yang sama di semua akun terkait; mulai dari email dan layanan keuangan.",
      "Aktifkan autentikasi multifaktor dan tinjau perangkat, sesi aktif, serta metode pemulihan akun.",
    ],
    takeaway:
      "Pakai kata sandi yang panjang dan berbeda untuk setiap layanan. Pengelola kata sandi dapat membantu membuat dan menyimpannya.",
  },
  {
    id: "money-transfer",
    category: "PENIPUAN TRANSAKSI",
    title: "Kamu sudah terlanjur mentransfer uang",
    story:
      "Setelah transfer atas instruksi dari chat, pengirim meminta biaya tambahan agar uang dikembalikan atau pesanan diproses.",
    question: "Apa tindakan berikutnya?",
    choices: [
      {
        label: "Kirim biaya tambahan supaya uang pertama bisa kembali",
        safe: false,
        outcome:
          "Permintaan biaya lanjutan dapat memperbesar kerugian dan belum tentu mengembalikan dana.",
      },
      {
        label:
          "Segera hubungi bank melalui kanal resmi dan laporkan transaksi",
        safe: true,
        outcome:
          "Ini langkah yang tepat. Bank dapat memberi panduan sesuai kasus; kecepatan melapor membantu proses, tetapi pengembalian dana tidak dapat dijamin.",
      },
      {
        label: "Hapus chat dan tunggu beberapa hari",
        safe: false,
        outcome:
          "Menunda dapat mengurangi kesempatan bank menindaklanjuti. Bukti transaksi dan percakapan juga berguna saat membuat laporan.",
      },
    ],
    recovery: [
      "Jangan kirim uang lagi, termasuk biaya yang dijanjikan untuk membuka pengembalian dana.",
      "Segera hubungi bank atau penyedia pembayaran dari aplikasi/nomor resmi; minta arahan dan catat nomor laporan.",
      "Simpan bukti transfer, waktu, nomor rekening, dan percakapan. Laporkan melalui kanal resmi seperti Indonesia Anti-Scam Centre (IASC) dan/atau kepolisian.",
    ],
    takeaway:
      "Jangan menyalahkan diri sendiri—penipuan dirancang untuk menekan dan membingungkan. Bertindak cepat, simpan bukti, dan gunakan kanal resmi.",
  },
];

export function LearningCenter() {
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [justIncremented, setJustIncremented] = useState(false);

  const { usersEducated, recordEducationAction } = useStats();

  const scenario =
    scenarios.find((item) => item.id === activeId) ?? scenarios[0];
  const selectedChoice =
    choiceIndex === null ? null : scenario.choices[choiceIndex];

  const chooseScenario = (id: string) => {
    setActiveId(id);
    setChoiceIndex(null);
    setJustIncremented(false);
  };

  const chooseAnswer = (index: number) => {
    setChoiceIndex(index);
    const chosen = scenario.choices[index];
    recordEducationAction(
      `Simulasi "${scenario.title}" (${chosen?.safe ? "Keputusan Aman" : "Evaluasi Risiko"})`
    );
    setJustIncremented(true);
    setCompleted((previous) =>
      previous.includes(scenario.id) ? previous : [...previous, scenario.id]
    );
  };

  return (
    <section className="mx-auto max-w-[1020px]">
      <PageHeading
        eyebrow="SIMULASI & PANDUAN KEAMANAN"
        title="Latihan mengambil keputusan aman."
        description="Coba skenario nyata sehari-hari, lihat dampak dari setiap pilihan, dan pelajari langkah pemulihan darurat. Setiap skenario yang kamu uji menambah statistik edukasi komunitas."
        badgeText={`Pengguna Teredukasi: ${new Intl.NumberFormat("id-ID").format(usersEducated)}`}
      />

      {/* Progress Banner with Out-of-bounds Badge */}
      <div className="relative mb-6 mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-[0_10px_28px_rgba(25,57,102,0.055)] sm:px-6">
        <div className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white shadow">
          <Sparkles size={11} className="text-[#c6f329]" />
          {completed.length}/{scenarios.length} Selesai
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <CircleHelp size={19} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#172944]">Progres Latihan Simulasi</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {completed.length} dari {scenarios.length} skenario sudah dieksplorasi
            </p>
          </div>
        </div>
        <div
          className="flex gap-1.5"
          aria-label={`${completed.length} dari ${scenarios.length} skenario selesai`}
        >
          {scenarios.map((item) => (
            <span
              key={item.id}
              className={`h-2.5 w-8 rounded-full transition-all ${
                completed.includes(item.id)
                  ? "bg-gradient-to-r from-[#1458d4] to-emerald-500"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Pilih skenario" className="space-y-2.5">
          {scenarios.map((item, index) => {
            const active = item.id === scenario.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseScenario(item.id)}
                aria-current={active ? "step" : undefined}
                className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? " -translate-y-0.5 border-blue-300 bg-gradient-to-r from-blue-50 to-white shadow-md"
                    : "border-slate-200 bg-white/90 hover:border-blue-200 hover:bg-white"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-extrabold tracking-[0.12em] ${
                      active ? "text-[#1458d4]" : "text-slate-500"
                    }`}
                  >
                    SKENARIO {index + 1}
                  </span>
                  {completed.includes(item.id) && (
                    <CheckCircle2 size={15} className="text-emerald-600" />
                  )}
                </span>
                <span className="mt-1.5 block text-xs font-bold leading-5 text-[#172944]">
                  {item.title}
                </span>
              </button>
            );
          })}
        </nav>

        <article className="relative overflow-visible rounded-[26px] border border-blue-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(25,57,102,0.06)] sm:p-7">
          <p className="text-[10px] font-extrabold tracking-[0.16em] text-[#1458d4]">
            {scenario.category}
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#172944]">
            {scenario.title}
          </h2>
          <p className="mt-3 rounded-2xl border border-slate-100 bg-[#f8faff] p-4 text-sm leading-6 text-slate-700">
            {scenario.story}
          </p>
          <h3 className="mt-6 text-sm font-bold text-[#172944]">
            {scenario.question}
          </h3>
          <div className="mt-3 space-y-2.5">
            {scenario.choices.map((choice, index) => {
              const selected = choiceIndex === index;
              return (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => chooseAnswer(index)}
                  aria-pressed={selected}
                  className={`w-full rounded-2xl border p-3.5 text-left text-xs leading-5 transition sm:p-4 ${
                    selected
                      ? choice.safe
                        ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-950 shadow-sm"
                        : "border-amber-300 bg-amber-50 font-semibold text-amber-950 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        selected
                          ? choice.safe
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-amber-600 bg-amber-500 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {selected && <CheckCircle2 size={13} />}
                    </span>
                    {choice.label}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {selectedChoice && (
              <motion.div
                key={`${scenario.id}-${choiceIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                aria-live="polite"
                className={`mt-5 rounded-2xl border p-4 sm:p-5 ${
                  selectedChoice.safe
                    ? "border-emerald-200 bg-emerald-50/90"
                    : "border-amber-200 bg-amber-50/90"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {selectedChoice.safe ? (
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />
                  ) : (
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-extrabold ${
                          selectedChoice.safe
                            ? "text-emerald-950"
                            : "text-amber-950"
                        }`}
                      >
                        {selectedChoice.safe
                          ? "Pilihan yang Tepat & Aman!"
                          : "Simulasi Dampak Risiko Pilihan Ini"}
                      </p>
                      {justIncremented && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-lime-300 bg-[#c6f329] px-2.5 py-0.5 text-[10px] font-extrabold text-[#16300b]">
                          <TrendingUp size={11} /> +1 Statistik Teredukasi
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-700">
                      {selectedChoice.outcome}
                    </p>
                  </div>
                </div>
                {!selectedChoice.safe && (
                  <div className="mt-4 border-t border-amber-200 pt-4">
                    <h4 className="text-xs font-bold text-amber-950">
                      Jika ini sudah terlanjur terjadi, lakukan sekarang:
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {scenario.recovery.map((step) => (
                        <li
                          key={step}
                          className="flex gap-2 text-xs leading-5 text-slate-700"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-700" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-4 border-t border-slate-200/80 pt-3 text-xs leading-5 text-slate-700">
                  <b>Kunci Utama:</b> {scenario.takeaway}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </article>
      </div>

      <section className="mt-9" aria-labelledby="habits-heading">
        <div className="mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">
            KEBIASAAN HARIAN
          </p>
          <h2 id="habits-heading" className="mt-1 text-lg font-extrabold text-[#172944]">
            Perlindungan Sederhana yang Berdampak Besar
          </h2>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <GuidanceCard
            icon={<LockKeyhole size={17} />}
            title="Rahasiakan kode dan kredensial"
            text="Jangan bagikan OTP, PIN, kata sandi, kode pemulihan, atau foto dokumen melalui chat maupun telepon."
          />
          <GuidanceCard
            icon={<ShieldCheck size={17} />}
            title="Verifikasi lewat jalur terpisah"
            text="Cari sendiri aplikasi, alamat situs, atau nomor resmi. Jangan gunakan kontak yang hanya tersedia di pesan mencurigakan."
          />
          <GuidanceCard
            icon={<CheckCircle2 size={17} />}
            title="Perkuat akun penting"
            text="Gunakan kata sandi unik, aktifkan autentikasi multifaktor, dan tinjau sesi/perangkat yang sedang masuk."
          />
          <GuidanceCard
            icon={<AlertTriangle size={17} />}
            title="Kalau ada insiden, bertindak cepat"
            text="Hentikan komunikasi dan pembayaran, amankan akun, simpan bukti, lalu hubungi penyedia layanan atau bank melalui kanal resmi."
          />
        </div>
      </section>

      <aside className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="text-sm font-bold text-[#172944]">
            Butuh melaporkan penipuan transaksi keuangan?
          </p>
          <p className="mt-1 max-w-[620px] text-xs leading-5 text-slate-600">
            Hubungi bank atau penyedia pembayaran secepatnya. Kamu juga dapat mengakses kanal
            pelaporan resmi Indonesia Anti-Scam Centre (IASC/OJK).
          </p>
        </div>
        <a
          href="https://iasc.ojk.go.id/"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-[#1458d4] shadow-sm transition hover:bg-blue-50 sm:mt-0"
        >
          Kunjungi IASC <ArrowUpRight size={14} />
        </a>
      </aside>
    </section>
  );
}

function GuidanceCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Tilt3DCard
      intensity={5}
      className="flex gap-3.5 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1458d4]">
        {icon}
      </span>
      <div>
        <h3 className="text-xs font-bold text-[#172944]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
      </div>
    </Tilt3DCard>
  );
}
