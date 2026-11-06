/**
 * ARSITEKTUR: Production Entrypoint Server (server.js)
 * TUJUAN: Menjalankan Next.js Frontend dan API Route dalam satu proses terpadu untuk cPanel/Arenhost
 * KATA KUNCI: Entrypoint, cPanel Deployment, HTTP Server, Phusion Passenger
 */

// Modul Inti Node.js: Membuat server protokol HTTP
const { createServer } = require("http");
// Modul Inti Node.js: Parsing rincian alamat URL request
const { parse } = require("url");
// Framework Inti: Inisialisasi engine Next.js
const next = require("next");
// Utilitas: Memuat variabel environment dari file .env
const dotenv = require("dotenv");

// Menjalankan pembacaan file konfigurasi .env
dotenv.config();

// Menentukan mode server: false saat production, true saat development
const dev = process.env.NODE_ENV !== "production";
// Menetapkan host listening ke seluruh antarmuka jaringan
const hostname = "0.0.0.0";
// Menetapkan nomor port aplikasi dari environment cPanel atau default 3000
const port = Number(process.env.PORT) || 3000;

// Membuat instance aplikasi Next.js
const app = next({ dev, hostname, port });
// Mengambil request handler bawaan Next.js untuk merender halaman dan API
const handle = app.getRequestHandler();

// Menyiapkan kompilasi dan aset aplikasi Next.js
app
  .prepare()
  .then(() => {
    // Membuat HTTP server untuk menangani setiap request yang masuk
    createServer(async (req, res) => {
      try {
        // Mengurai alamat URL dan parameter query dari request
        const parsedUrl = parse(req.url, true);
        // Meneruskan penanganan request ke router internal Next.js
        await handle(req, res, parsedUrl);
      } catch (err) {
        // Mencatat log kesalahan server jika terjadi galat saat penanganan request
        console.error("Error occurred handling", req.url, err);
        // Menetapkan kode status HTTP 500 (Internal Server Error)
        res.statusCode = 500;
        // Mengakhiri respon dengan pesan galat
        res.end("Internal Server Error");
      }
    // Mengaktifkan server untuk mendengarkan koneksi pada port yang ditentukan
    }).listen(port, (err) => {
      // Memeriksa jika terjadi galat saat inisialisasi listening port
      if (err) throw err;
      // Mencatat pesan keberhasilan server aktif ke console
      console.log(`> [SADAR Production Server] Aktif di http://${hostname}:${port}`);
    });
  })
  // Menangani kegagalan inisialisasi aplikasi Next.js
  .catch((err) => {
    // Menampilkan pesan kegagalan fatal ke console
    console.error("Gagal menjalankan server SADAR:", err);
    // Menghentikan proses dengan kode status galat
    process.exit(1);
  });
