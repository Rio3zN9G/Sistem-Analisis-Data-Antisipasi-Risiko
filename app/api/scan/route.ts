// Next.js Server Handler: Mengembalikan respon HTTP berformat JSON
import { NextResponse } from "next/server";
// Modul Inti: Pemindai URL multi-engine (Google Safe Browsing, DNS, URLhaus, AI)
import { scanUrlComplete } from "@/lib/scanner";

/**
 * ENDPOINT: POST /api/scan
 * TUJUAN: Menerima permintaan pemindaian alamat tautan (URL) dari antarmuka pengguna
 * KATA KUNCI: Route Handler, URL Scanner, Threat API Endpoint
 */
export async function POST(request: Request) {
  try {
    // Membaca payload JSON dari body request
    const body = await request.json();
    // Mengambil nilai parameter url dan membersihkan spasi liar
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    // Validasi: pastikan URL tidak kosong
    if (!rawUrl) {
      // Mengembalikan respon galat HTTP 400 jika URL kosong
      return NextResponse.json(
        { error: "Masukkan alamat URL yang ingin diperiksa." },
        { status: 400 }
      );
    }

    // Menjalankan pemindaian tautan multi-engine secara asinkron
    const result = await scanUrlComplete(rawUrl);
    // Mengembalikan hasil analisis keamanan tautan dalam format JSON
    return NextResponse.json(result);
  } catch (err) {
    // Menangkap kesalahan dan mengembalikan pesan galat ramah pengguna
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Tautan belum dapat diperiksa saat ini.",
      },
      { status: 400 }
    );
  }
}
