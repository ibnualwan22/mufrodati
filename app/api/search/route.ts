import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analisisIlal } from "@/lib/shorof/ilalEngine";
import { deteksiBina, hapusHarakat } from "@/lib/shorof/bina";
import { Prisma } from "@prisma/client";

// ─── Urutan deteksi shighot (kolom lebih spesifik dulu) ──────────────────────
const SHIGHOT_PRIORITY: { col: string; shighot: string }[] = [
  { col: "amr",        shighot: "Fi'il Amr" },
  { col: "nahyi",      shighot: "Fi'il Nahyi" },
  { col: "mudhari",    shighot: "Fi'il Mudhari'" },
  { col: "masdarMim",  shighot: "Masdar Mim" },
  { col: "masdar",     shighot: "Masdar" },
  { col: "faail",      shighot: "Isim Fa'il" },
  { col: "mafuul",     shighot: "Isim Maf'ul" },
  { col: "zamanMakan", shighot: "Isim Zaman/Makan" },
  { col: "alaat",      shighot: "Isim Alat" },
  { col: "madhi",      shighot: "Fi'il Madhi" },
  { col: "rootWord",   shighot: "Akar Kata" },
  { col: "indonesian", shighot: "Terjemahan" },
];

// Peta kolom DB → Nama kolom SQL (camelCase → PascalCase sesuai Prisma mapping)
const COL_TO_SQL: Record<string, string> = {
  rootWord:   "rootWord",
  indonesian: "indonesian",
  madhi:      "madhi",
  mudhari:    "mudhari",
  masdar:     "masdar",
  masdarMim:  "masdarMim",
  faail:      "faail",
  mafuul:     "mafuul",
  amr:        "amr",
  nahyi:      "nahyi",
  zamanMakan: "zamanMakan",
  alaat:      "alaat",
};

// Karakter harakat Arab U+064B sampai U+065F (semua tanda baca/vokal Arab)
// Karakter ini digunakan dalam pola regexp_replace di PostgreSQL
const HARAKAT_PG_PATTERN = "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655\u0656\u0657\u0658\u0659\u065A\u065B\u065C\u065D\u065E\u065F\u0670";

/**
 * GET /api/search?q=[kata]
 *
 * Pencarian morfologis terbalik yang HARAKAT-INSENSITIVE.
 * Menggunakan PostgreSQL regexp_replace() untuk menghapus harakat dari
 * nilai kolom di database sebelum perbandingan, sehingga:
 *   - User ketik "يَعِدُ" (dengan harakat) → cocok dengan DB "يَعِدُ" ✓
 *   - User ketik "يعد"   (tanpa harakat)  → cocok dengan DB "يَعِدُ" ✓
 *   - User ketik "berpuasa"               → cocok dengan DB "Berpuasa" ✓
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Parameter 'q' dibutuhkan." }, { status: 400 });
  }

  // Hapus harakat dari query user untuk perbandingan yang adil
  const cleanQ = hapusHarakat(q);

  try {
    // ─── Raw Query: strip harakat di sisi DB dengan regexp_replace ────────────
    // Pola regex PostgreSQL: karakter harakat Arab distrip dari tiap kolom,
    // kemudian dibandingkan dengan ILIKE (case-insensitive) terhadap cleanQ.
    //
    // Mengapa Raw Query?
    // Prisma ORM tidak bisa memanggil fungsi PostgreSQL seperti regexp_replace()
    // dalam klausa WHERE melalui query builder standar.
    const harakatPattern = `[${HARAKAT_PG_PATTERN}]`;
    const searchPattern  = `%${cleanQ}%`;

    const results = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM "Word"
      WHERE
        regexp_replace("rootWord",   ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("indonesian", ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("madhi",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("mudhari",  ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("masdar",   ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("masdarMim",${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("faail",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("mafuul",   ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("amr",      ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("nahyi",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("zamanMakan",${harakatPattern}, '', 'g') ILIKE ${searchPattern}
        OR regexp_replace("alaat",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern}
      LIMIT 1
    `;

    const word = results[0] ?? null;

    if (!word) {
      return NextResponse.json({ found: false, word: null }, { status: 200 });
    }

    // ─── Deteksi Shighot: cek kolom mana yang exact-match setelah strip harakat ─
    let shighot_pencarian = "Akar Kata";
    for (const { col, shighot } of SHIGHOT_PRIORITY) {
      const dbVal = word[col];
      if (!dbVal) continue;
      // Strip harakat dari nilai DB, bandingkan exact
      const dbBersih = hapusHarakat(String(dbVal));
      if (dbBersih === cleanQ) {
        shighot_pencarian = shighot;
        break;
      }
    }

    // ─── Deteksi Bina' & Analisis I'lal ──────────────────────────────────────
    const bina       = deteksiBina(word.rootWord);
    const ilalResult = analisisIlal(q, word.rootWord, bina, shighot_pencarian);

    return NextResponse.json({
      found: true,
      word,
      shighot_pencarian,
      ilal: ilalResult,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: String(error) }, { status: 500 });
  }
}
