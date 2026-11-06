// Next.js Server Handler: Mengembalikan respon HTTP standar
import { NextResponse } from "next/server";

/**
 * ENDPOINT: GET /api/health
 * TUJUAN: Healthcheck status ketersediaan server dan pemantauan uptime
 * KATA KUNCI: Healthcheck, Status Server, Diagnostic
 */
export async function GET() {
  // Mengembalikan objek status sistem aktif beserta stempel waktu ISO
  return NextResponse.json({
    status: "ok",
    service: "sadar-next-api",
    timestamp: new Date().toISOString(),
  });
}
