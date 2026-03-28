import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { generateSemuaTasrif }       from "@/lib/shorof/tasrifGenerator";

// ══════════════════════════════════════════════════════════════════════════════
//  GET /api/words?q=[keyword]
//  Pencarian sederhana (untuk legacy endpoint; yang utama pakai /api/search)
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  try {
    if (q) {
      // Strip harakat dari query agar bisa mencocokkan teks tanpa harakat
      const cleanQ = q.replace(/[\u064B-\u065F\u0670]/g, "");
      const words = await prisma.word.findMany({
        where: {
          OR: [
            { rootWord:   { contains: cleanQ, mode: "insensitive" } },
            { indonesian: { contains: cleanQ, mode: "insensitive" } },
          ],
        },
      });
      return NextResponse.json(words);
    }

    const all = await prisma.word.findMany({ take: 10, orderBy: { createdAt: "desc" } });
    return NextResponse.json(all);
  } catch (err) {
    console.error("GET /api/words:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /api/words
//  Admin menginput kata baru secara minimal; sistem men-generate semua tasrif.
//
//  Body JSON yang diterima:
//  {
//    "rootWord"  : "صوم",         ← Akar kata 3 huruf (tanpa harakat)
//    "indonesian": "berpuasa",    ← Terjemahan Indonesia
//    "bab"       : 1,             ← Nomor bab (integer 1–6)
//    "masdar"    : "صِيَامًا",     ← Masdar yang benar (diisi manual admin)
//    "lazim"?    : true,          ← Opsional: jika fi'il lazim (tidak ada maf'ul)
//    "bukanAlatFiil"?: true       ← Opsional: tidak generate isim alat
//  }
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Validasi Input Minimal ───────────────────────────────────────────────
    const { rootWord, indonesian, bab, masdar } = body;

    if (!rootWord || typeof rootWord !== "string") {
      return NextResponse.json(
        { error: "Field 'rootWord' (akar kata) wajib diisi." },
        { status: 400 }
      );
    }
    if (!indonesian || typeof indonesian !== "string") {
      return NextResponse.json(
        { error: "Field 'indonesian' (terjemahan) wajib diisi." },
        { status: 400 }
      );
    }
    if (!masdar || typeof masdar !== "string") {
      return NextResponse.json(
        { error: "Field 'masdar' wajib diisi (tidak bisa di-generate otomatis)." },
        { status: 400 }
      );
    }

    const babNum = Number(bab);
    if (!bab || ![1, 2, 3, 4, 5, 6].includes(babNum)) {
      return NextResponse.json(
        { error: "Field 'bab' wajib diisi dengan angka 1–6." },
        { status: 400 }
      );
    }

    // ── Generate Semua Tasrif via Engine ─────────────────────────────────────
    const wordData = generateSemuaTasrif(
      rootWord,
      indonesian,
      babNum as 1 | 2 | 3 | 4 | 5 | 6,
      masdar,
      {
        lazim:    body.lazim    ?? false,
        polaAlat: body.polaAlat ?? undefined,
      }
    );

    // ── Simpan ke Database ────────────────────────────────────────────────────
    const newWord = await prisma.word.create({ data: wordData });

    return NextResponse.json(
      {
        success: true,
        message: `Kata "${rootWord}" (${indonesian}) berhasil ditambahkan dengan tasrif lengkap.`,
        word: newWord,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/words:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal.", details: String(err) },
      { status: 500 }
    );
  }
}
