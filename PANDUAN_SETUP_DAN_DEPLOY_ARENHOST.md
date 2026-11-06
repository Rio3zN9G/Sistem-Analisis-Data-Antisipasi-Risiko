# Panduan Lengkap Setup API Pihak Ketiga & Deploy ke Hosting Arenhost (cPanel)

Dokumen ini menjelaskan cara mengisi konfigurasi **API Pihak Ketiga** yang masih kosong pada proyek **SADAR**, serta langkah demi langkah mendeploy aplikasi ini ke layanan hosting **Arenhost** menggunakan fitur **Setup Node.js App** di cPanel.

---

## Bagian 1: Cara Setup API Pihak Ketiga yang Masih Kosong

Seluruh konfigurasi API disimpan di sisi server melalui file `.env` (untuk lokal) atau melalui menu **Environment Variables** pada **Setup Node.js App** di cPanel Arenhost.

> **Catatan Keamanan:** Jangan pernah menambahkan prefix `NEXT_PUBLIC_` pada API key rahasia agar kunci API Anda tidak pernah terekspos ke browser pengunjung.

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Berikut cara mendapatkan masing-masing API Key:

### 1. API Deteksi Chat & Screenshot OCR (`GEMINI_API_KEY`) — **Sangat Direkomendasikan & Gratis**
Digunakan oleh endpoint `/api/analyze` untuk menganalisis teks percakapan sekaligus **membaca gambar screenshot (AI Vision OCR)** secara nyata.
1. Kunjungi **[Google AI Studio](https://aistudio.google.com/app/apikey)** dan login menggunakan akun Google Anda.
2. Klik tombol **"Create API Key"**.
3. Salin kode API (diawali dengan `AIza...`) lalu tempelkan ke variabel berikut di `.env`:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualGeminiKeyHere
   GEMINI_MODEL=gemini-2.0-flash
   ```

### 2. Alternatif AI Pihak Ketiga (`GROQ_API_KEY` atau `OPENAI_API_KEY`) — *Opsional*
Jika Anda ingin memakai provider AI cadangan apabila kuota Gemini habis:
- **Groq Cloud (Gratis & Sangat Cepat untuk Teks):**
  1. Daftar/Login di **[Groq Console](https://console.groq.com/keys)**.
  2. Klik **Create API Key**, lalu masukkan ke:
     ```env
     GROQ_API_KEY=gsk_your_groq_key_here
     GROQ_MODEL=llama-3.3-70b-versatile
     ```
- **OpenAI API (Mendukung Teks & Gambar):**
  1. Buat key di **[OpenAI Platform](https://platform.openai.com/api-keys)**.
  2. Masukkan ke:
     ```env
     OPENAI_API_KEY=sk-proj-your_openai_key_here
     OPENAI_MODEL=gpt-4o-mini
     ```

### 3. API Pemindai Link Phishing (`GOOGLE_SAFE_BROWSING_API_KEY`)
Digunakan oleh endpoint `/api/scan` untuk memeriksa apakah sebuah URL tercatat dalam database malware/phishing resmi Google Safe Browsing v4.
1. Buka **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Buat proyek baru atau pilih proyek yang ada.
3. Masuk ke menu **APIs & Services > Library**, cari **"Safe Browsing API"**, lalu klik **Enable**.
4. Masuk ke menu **APIs & Services > Credentials**, klik **Create Credentials > API Key**.
5. Masukkan key tersebut ke `.env`:
   ```env
   GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyYourSafeBrowsingKeyHere
   ```

### 4. Mirror Cek E-Wallet & Rekening Kominfo (`/api/ewallet-check`)
Kementerian Komunikasi dan Digital (Kemkomdigi / Kominfo) melalui portal **CekRekening.id** tidak membuka endpoint API publik tanpa otorisasi khusus karena dilindungi Captcha. Oleh karena itu, fitur **Cek E-Wallet** di SADAR sudah langsung berjalan menggunakan:
1. **Database Mirror Internal SADAR & Pelaporan Real-Time** (mendukung pengecekan nomor DANA, GoPay, OVO, ShopeePay, LinkAja, serta Rekening Bank, deteksi operator seluler/Virtual Account otomatis, dan fitur tambah laporan nomor penipu).
2. **Jembatan Verifikasi Silang 1-Klik** langsung ke portal resmi `https://cekrekening.id/periksa-rekening` dan `https://aduannomor.id`.
3. **Opsional (`CEKREKENING_API_URL` & `CEKREKENING_API_KEY`):** Jika di kemudian hari Anda berlangganan API agregator KYC/CekRekening pihak ketiga, Anda cukup mengisi URL endpoint dan API key-nya di `.env` tanpa perlu mengubah kode:
   ```env
   CEKREKENING_API_URL=https://api-provider-anda.com/v1/check
   CEKREKENING_API_KEY=secret_key_anda
   ```

---

## Bagian 2: Panduan Deploy ke Hosting Arenhost (cPanel)

Proyek ini telah dilengkapi file **`server.js`** di folder utama yang menggabungkan **Frontend Next.js** dan **seluruh Backend API (`/api/analyze`, `/api/ewallet-check`, `/api/scan`, `/api/health`)** dalam satu aplikasi Node.js sehingga sangat mudah dipasang di cPanel **Arenhost**.

`### Langkah 1: Build Proyek di Komputer Lokal (Direkomendasikan)
Agar server hosting Arenhost tidak kehabisan memori (RAM) saat melakukan kompilasi Webpack, lakukan proses build terlebih dahulu di komputer Anda:

1. Buka terminal di folder proyek ini, lalu jalankan:
   ```bash
   npm install
   npm run build
   ```
2. Pastikan folder `.next` berhasil terbentuk tanpa error.
3. Buat arsip **`.zip`** (misal: `sadar-deploy.zip`) yang berisi file dan folder berikut:
   - Folder `.next/` *(wajib ada hasil build)*
   - Folder `app/`
   - Folder `components/`
   - Folder `public/`
   - Folder `server/`
   - File `server.js` *(file startup utama untuk cPanel)*
   - File `package.json` dan `package-lock.json`
   - File `next.config.js`, `postcss.config.js`, `tailwind.config.ts`, `tsconfig.json`
   > **Catatan:** Jangan masukkan folder `node_modules` ke dalam file `.zip` agar ukuran upload kecil dan modul dapat disesuaikan dengan OS Linux di server Arenhost.

### Langkah 2: Upload File ke cPanel Arenhost
1. Login ke dashboard **cPanel Arenhost** Anda.
2. Buka menu **File Manager**.
3. Buat folder baru di luar `public_html`, misalnya beri nama **`sadar-app`** (contoh jalur: `/home/username_cpanel/sadar-app`).
4. Masuk ke folder `sadar-app`, klik **Upload**, lalu unggah file `sadar-deploy.zip`.
5. Klik kanan pada `sadar-deploy.zip` lalu pilih **Extract** hingga seluruh file berada langsung di dalam `/home/username_cpanel/sadar-app`.

### Langkah 3: Konfigurasi "Setup Node.js App" di cPanel Arenhost
1. Kembali ke halaman utama cPanel Arenhost, gulir ke bagian **Software**, lalu klik **Setup Node.js App**.
2. Klik tombol **+ Create Application**.
3. Isi formulir dengan pengaturan berikut:
   - **Node.js version:** Pilih **20.x** atau **22.x** (minimal Node 20.9+).
   - **Application mode:** Pilih **Production**.
   - **Application root:** Ketik `sadar-app` (sesuai nama folder yang Anda buat di Langkah 2).
   - **Application URL:** Pilih domain atau subdomain Anda (biarkan kolom path kosong jika ingin diakses di domain utama).
   - **Application startup file:** Ketik **`server.js`**
4. Gulir ke bawah ke bagian **Environment variables**, klik **Add Variable** untuk menambahkan kunci API Anda:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = *(isi API key Gemini Anda)*
   - `GEMINI_MODEL` = `gemini-2.0-flash`
   - `GOOGLE_SAFE_BROWSING_API_KEY` = *(isi API key Google Safe Browsing Anda)*
   - *(Opsional)* `GROQ_API_KEY` atau `OPENAI_API_KEY`
5. Klik tombol **Create** di kanan atas dan tunggu beberapa detik.

### Langkah 4: Install Dependencies & Jalankan Server
1. Setelah aplikasi berhasil dibuat di halaman **Setup Node.js App**, klik tombol **Run NPM Install** (atau salin perintah `source /home/.../nodevenv/...` lalu jalankan `npm install --omit=dev` di menu **Terminal** cPanel).
2. Setelah instalasi paket selesai, klik tombol **Restart** pada halaman **Setup Node.js App**.
3. Buka domain Anda di browser:
   - Halaman utama SADAR akan langsung tampil beserta animasi logo pembuka dan indikator status koneksi.
   - Uji endpoint kesehatan server di `https://domain-anda.com/api/health` (akan menampilkan `{"status":"ok","service":"sadar-next-api",...}`).
