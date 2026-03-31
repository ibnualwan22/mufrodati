import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hapusHarakat } from "@/lib/shorof/bina";

const HARAKAT_PG_PATTERN =
  "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655\u0656\u0657\u0658\u0659\u065A\u065B\u065C\u065D\u065E\u065F\u0670";

/**
 * GET /api/suggest?q=[kata]
 *
 * Mengembalikan daftar kata yang cocok (maks 8) untuk autocomplete.
 * Setiap entri berisi: id, rootWord, indonesian, madhi, mudhari, bab, bina,
 * dan kolom_cocok (kolom mana yang match).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  const cleanQ = hapusHarakat(q.trim());
  const harakatPattern = `[${HARAKAT_PG_PATTERN}]`;
  const searchPattern = `${cleanQ}%`; // starts-with untuk rootWord/madhi
  const searchPatternAny = `%${cleanQ}%`; // contains untuk kolom lain

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        "rootWord",
        "indonesian",
        "madhi",
        "mudhari",
        "masdar",
        "bab",
        "bina",
        CASE
          WHEN regexp_replace("rootWord", ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 1
          WHEN regexp_replace("madhi",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 2
          WHEN regexp_replace("mudhari",  ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 3
          WHEN regexp_replace("indonesian", ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny} THEN 4
          WHEN regexp_replace("masdar",   ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny} THEN 5
          ELSE 6
        END AS rank,
        CASE
          WHEN regexp_replace("rootWord", ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 'Akar Kata'
          WHEN regexp_replace("madhi",    ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 'Fi''il Madhi'
          WHEN regexp_replace("mudhari",  ${harakatPattern}, '', 'g') ILIKE ${searchPattern} THEN 'Fi''il Mudhari'''
          WHEN regexp_replace("masdar",   ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny} THEN 'Masdar'
          WHEN regexp_replace("indonesian", ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny} THEN 'Terjemahan'
          ELSE 'Shighot Lain'
        END AS kolom_cocok
      FROM "Word"
      WHERE
        regexp_replace("rootWord",   ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("indonesian", ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("madhi",    ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("mudhari",  ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("masdar",   ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("masdarMim",${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("faail",    ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("mafuul",   ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("amr",      ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("nahyi",    ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("zamanMakan",${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
        OR regexp_replace("alaat",    ${harakatPattern}, '', 'g') ILIKE ${searchPatternAny}
      ORDER BY rank ASC, length("rootWord") ASC
      LIMIT 8
    `;

    return NextResponse.json({ suggestions: rows });
  } catch (error) {
    console.error("GET /api/suggest error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
