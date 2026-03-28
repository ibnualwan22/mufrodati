import { NextRequest, NextResponse } from "next/server";
import { prosesTasrifDanIlal } from "@/lib/shorof/ilalEngine";

/**
 * Menerima payload JSON: { "kata": "صَوَمَ", "akarKata": "صوم" }
 * Mengembalikan data analitik Shorof dan rekaman log I'lal.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kata, akarKata } = body;

    // Validasi input
    if (!kata || !akarKata) {
      return NextResponse.json(
        { error: "Harap masukkan parameter 'kata' dan 'akarKata'." },
        { status: 400 }
      );
    }

    // Melakukan proses I'lal dan mendeteksi Bina' di dalam Engine
    const hasilIlal = prosesTasrifDanIlal(kata, akarKata);

    return NextResponse.json(
      {
        bina: hasilIlal.bina,
        asalKata: hasilIlal.asalKata,
        hasilAkhir: hasilIlal.hasilAkhir,
        logProses: hasilIlal.logProses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Kesalahan saat memproses I'lal:", error);
    return NextResponse.json(
      { error: "Kesalahan internal pada Engine Shorof", details: String(error) },
      { status: 500 }
    );
  }
}
