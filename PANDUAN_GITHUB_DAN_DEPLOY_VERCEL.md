# Panduan Upload ke GitHub dan Deploy SADAR ke Vercel

Panduan ini menjelaskan file yang perlu dimasukkan ke repository GitHub, alasan folder `.next` tampak tersembunyi, dan cara menghubungkan project SADAR ke Vercel.

## Cara termudah: GitHub Desktop

Cara ini mengirim folder project ke GitHub tanpa memilih dan mengunggah file satu per satu. GitHub Desktop memakai Git untuk mengirim file dan mengikuti aturan pengecualian di `.gitignore`.

1. Pastikan project berada di folder:
   `C:\Users\MyBook Hype\Downloads\web design`
2. Pasang [GitHub Desktop](https://desktop.github.com/) dan login dengan akun GitHub.
3. Anda tidak perlu membuat repository kosong lebih dulu di situs GitHub. Repository remote akan dibuat ketika project lokal dipublikasikan.
4. Di GitHub Desktop, pilih **File → Add Local Repository...** dan pilih folder project di atas.
   - Jika muncul pesan bahwa folder bukan repository Git, pilih tautan **create a repository here instead**.
   - Gunakan nama repository yang sesuai, misalnya `sadar-cyber-education`, dan pastikan lokasi repository menunjuk ke folder project yang sudah ada.
   - Untuk Git ignore, pilih **None** atau jangan buat template baru. File `.gitignore` project sudah mengatur pengecualian. Jangan menimpa file README project.
5. Sebelum commit, periksa daftar perubahan. Jangan lanjutkan jika `.env`, `node_modules`, `.next`, atau `src.zip` muncul di daftar file yang akan dimasukkan.
6. Isi ringkasan commit, misalnya `Initial SADAR project`, lalu pilih **Commit to main**.
7. Pilih **Publish repository**. Pilih nama repository dan visibilitas **Private** atau **Public**, lalu konfirmasi. Langkah ini membuat repository GitHub dan mengirim commit project ke sana.
8. Buka repository di GitHub dan pastikan source code serta `.gitignore` terlihat. File `.env` seharusnya tidak ada.

## File dan folder yang perlu ada di GitHub

Masukkan source code, aset, file konfigurasi project, dan lockfile berikut:

- Folder `app/`
- Folder `components/`
- Folder `lib/`
- Folder `public/`
- Folder `server/`
- Folder `src/`
- File `.gitignore` — termasuk file ini walau namanya diawali titik.
- File `.env.example` — template dengan nilai API key kosong; jangan isi dengan key aktif.
- File `package.json` dan `package-lock.json`
- File `next.config.js`, `postcss.config.js`, `tailwind.config.ts`, dan `tsconfig.json`
- File `next-env.d.ts`, `README.md`, `AGENTS.md`, dan `server.js`
- Dokumen panduan lain boleh ikut disimpan, misalnya `PANDUAN_SETUP_DAN_DEPLOY_ARENHOST.md`.

GitHub Desktop akan menambahkan file project secara otomatis, kecuali file/folder yang cocok dengan aturan `.gitignore`. Jika mengunggah melalui browser GitHub, pilih source code dan konfigurasi di atas, pertahankan struktur folder, dan unggah `.gitignore` secara eksplisit bila pemilih file menyembunyikan file yang namanya diawali titik.

## Jangan masukkan file/folder berikut

- **`.env` dan `.env.local`** — dapat berisi API key rahasia. Keduanya sudah dikecualikan oleh `.gitignore`.
- **`node_modules/`** — berisi paket hasil instalasi dan sangat besar; Vercel akan memasang dependency dari `package.json` dan `package-lock.json`.
- **`.next/`** — hasil build/cache Next.js yang dibuat ulang saat build. Tidak perlu diunggah ke GitHub atau Vercel.
- **`src.zip`** — arsip besar yang tidak diperlukan untuk build. Sudah dikecualikan di `.gitignore`.
- **`out/`, `coverage/`, dan `*.tsbuildinfo`** — keluaran build, test, atau cache lokal.

GitHub membatasi upload melalui browser maksimal 100 file sekaligus dan 25 MiB per file. GitHub Desktop lebih sesuai untuk project dengan banyak file. Jangan membuat ZIP project lalu mengunggah ZIP itu sebagai pengganti source code.

## Mengapa `.next` mengatakan folder hidden?

Nama folder yang diawali titik (`.`) dianggap tersembunyi oleh banyak antarmuka Windows dan halaman upload. `.next` adalah folder tersembunyi yang dibuat otomatis ketika Next.js menjalankan build atau development; folder ini bukan source code utama.

Project ini sudah mengecualikan `.next/` di `.gitignore`. Jadi **tidak perlu membuka pengaturan untuk menampilkan hidden folder atau memaksa upload `.next`**. Vercel akan membuat folder build sendiri saat melakukan deployment.

## Deploy repository ke Vercel

1. Buka [Vercel](https://vercel.com/) dan masuk menggunakan akun GitHub.
2. Dari dashboard, pilih **Add New → Project**.
3. Pilih **Import** pada repository SADAR yang baru dipublikasikan.
4. Periksa pengaturan sebelum deploy:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (folder utama repository, yang berisi `package.json`)
   - **Build Command:** biarkan default atau gunakan `npm run build`
   - **Install Command:** biarkan default (`npm install`)
5. Pada bagian **Environment Variables**, tambahkan API key yang ingin digunakan. Nama variabel harus sama persis:
   - `GEMINI_API_KEY` — disarankan untuk analisis teks dan gambar.
   - `GOOGLE_SAFE_BROWSING_API_KEY` — untuk integrasi Google Safe Browsing.
   - `OPENAI_API_KEY` — opsional, sebagai provider alternatif.
   - `GROQ_API_KEY` — opsional, provider alternatif untuk teks.
   - `CEKREKENING_API_URL` dan `CEKREKENING_API_KEY` — opsional jika menggunakan layanan eksternal.

   Nilai API key harus dimasukkan langsung pada pengaturan Environment Variables Vercel, bukan di repository, file `.env.example`, source code, atau chat. Pilih environment yang diperlukan (umumnya **Production**, dan **Preview** bila deployment preview juga memerlukan API). Nama variabel opsional seperti `GEMINI_MODEL`, `OPENAI_MODEL`, dan `GROQ_MODEL` hanya perlu ditambahkan jika ingin mengubah nilai default.
6. Klik **Deploy** dan tunggu build selesai.
7. Buka URL deployment yang diberikan Vercel. Uji halaman utama dan endpoint `https://NAMA-PROJECT.vercel.app/api/health`.
8. Jika Anda menambahkan atau mengganti Environment Variables setelah deployment, jalankan **Redeploy** agar deployment baru membaca nilai terbaru.

Untuk konfigurasi Vercel, jangan menyalin nilai lokal `PORT`, `WEB_ORIGIN=http://localhost:3000`, atau `NEXT_PUBLIC_API_URL=http://localhost:3000` dari `.env.example`. API pada project ini menggunakan route Next.js di `app/api/`; Vercel menangani route tersebut sebagai fungsi, bukan menjalankan `server.js` sebagai server tetap.

## Jika deployment gagal

- Buka tab **Deployments** di Vercel, pilih deployment yang gagal, lalu periksa **Build Logs**.
- Pastikan `package.json` dan `package-lock.json` berada di root repository dan root directory Vercel menunjuk ke folder yang benar.
- Pastikan semua source folder yang disebutkan di atas masuk ke GitHub.
- Jangan mengunggah `.next` sebagai cara memperbaiki build; perbaiki error build berdasarkan log.
- Bila aplikasi berhasil dibuka tetapi fitur AI gagal, periksa nama dan nilai Environment Variables di Vercel, lalu redeploy.

## Catatan keamanan dan batasan

- API key yang pernah tercantum di file template harus dianggap terekspos: cabut key lama dan buat key baru di dashboard provider sebelum dipakai di Vercel.
- Paket gratis Vercel memiliki batas penggunaan dan ketentuan penggunaan tersendiri. Periksa [harga Vercel](https://vercel.com/pricing) dan ketentuan plan Hobby sebelum menjadikan aplikasi sebagai layanan komersial atau untuk penggunaan organisasi.
- Laporan baru pada fitur cek rekening saat ini disimpan dalam memori aplikasi. Pada lingkungan serverless seperti Vercel, data tersebut tidak dijamin persisten; gunakan database jika laporan harus tersimpan permanen.
