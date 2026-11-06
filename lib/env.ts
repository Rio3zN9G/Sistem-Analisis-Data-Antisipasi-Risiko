// Modul utilitas sistem: membaca file dari sistem operasi
import fs from "fs";
// Modul utilitas sistem: manipulasi jalur direktori (path)
import path from "path";
// Library konfigurasi: parsing file variabel environment (.env)
import dotenv from "dotenv";

/**
 * FUNGSI: getEnv
 * TUJUAN: Membaca kunci konfigurasi API & Environment secara dinamis
 * PRIORITAS: .env.local -> .env -> .env.example -> process.env
 * KATA KUNCI: Konfigurasi, Environment Variable, API Key Loader
 */
export function getEnv(key: string, defaultValue = ""): string {
  // Daftar file target konfigurasi lokal dan cadangan
  const files = [".env.local", ".env", ".env.example"];
  // Menentukan direktori kerja utama proyek
  const rootDir = process.cwd();

  // Iterasi pencarian file konfigurasi
  for (const file of files) {
    try {
      // Menggabungkan path direktori dengan nama file
      const fullPath = path.join(rootDir, file);
      // Memeriksa keberadaan file fisik di disk
      if (fs.existsSync(fullPath)) {
        // Membaca teks mentah isi file
        const content = fs.readFileSync(fullPath, "utf8");
        // Melakukan parsing string menjadi objek key-value
        const parsed = dotenv.parse(content);
        // Mengambil nilai variabel berdasarkan kunci yang dicari
        const val = (parsed[key] || "").trim();
        // Validasi: pastikan nilai bukan placeholder kosong bawaan template
        if (
          val &&
          !val.startsWith("ISI_") &&
          val !== "your_gemini_api_key" &&
          val !== "your_google_safe_browsing_key"
        ) {
          // Mengembalikan kunci API aktif yang valid
          return val;
        }
      }
    } catch {
      // Penanganan galat jika file tidak dapat diakses
    }
  }

  // Fallback: memeriksa variabel bawaan sistem operasi / process.env
  const procVal = (process.env[key] || "").trim();
  // Validasi nilai variabel dari process.env
  if (
    procVal &&
    !procVal.startsWith("ISI_") &&
    procVal !== "your_gemini_api_key" &&
    procVal !== "your_google_safe_browsing_key"
  ) {
    // Mengembalikan nilai dari environment sistem
    return procVal;
  }

  // Mengembalikan nilai standar (default) jika kunci tidak ditemukan
  return defaultValue;
}
