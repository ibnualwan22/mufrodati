/**
 * scripts/simii/publish.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LANGKAH 4: Publish data terverifikasi ke tabel Word
 *
 * Cara pakai:
 *   npx tsx scripts/simii/publish.ts [batchId]
 *
 * Contoh:
 *   npx tsx scripts/simii/publish.ts              # publish semua VERIFIED
 *   npx tsx scripts/simii/publish.ts 2026-10-19-001  # publish satu batch
 *
 * Fitur:
 *   - Hanya publish status VERIFIED
 *   - Skip duplikat (berdasarkan madhi + bab di Word)
 *   - Update status → PUBLISHED + simpan publishedWordId
 *   - Bisa diulang (idempotent)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const batchId = process.argv[2];

  const where: any = { status: "VERIFIED" };
  if (batchId) where.batchId = batchId;

  const items = await prisma.simaIImport.findMany({ where });

  if (items.length === 0) {
    console.log("Tidak ada data VERIFIED yang perlu di-publish.");
    return;
  }

  console.log(`Publish ${items.length} item${batchId ? ` dari batch ${batchId}` : ""}...`);

  let published = 0;
  let skipped = 0;

  for (const item of items) {
    // Validasi: field wajib harus ada
    if (!item.madhi || !item.mudhari || !item.indonesian || !item.rootWord) {
      console.log(`  ✗ ${item.madhi}: field wajib tidak lengkap, skip`);
      skipped++;
      continue;
    }

    // Cek duplikat di Word
    const existing = await prisma.word.findFirst({
      where: { madhi: item.madhi, bab: item.bab || undefined },
    });

    if (existing) {
      console.log(`  ⊘ ${item.madhi}: sudah ada di Word, skip`);
      // Tandai sebagai published agar tidak diproses lagi
      await prisma.simaIImport.update({
        where: { id: item.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), publishedWordId: existing.id },
      });
      skipped++;
      continue;
    }

    // Buat di Word
    const word = await prisma.word.create({
      data: {
        rootWord: item.rootWord,
        indonesian: item.indonesian,
        bab: item.bab,
        bina: item.bina,
        transitive: item.transitive,
        jenisFiil: item.jenisFiil,
        madhi: item.madhi,
        mudhari: item.mudhari,
        masdar: item.masdar,
        masdarMim: item.masdarMim,
        faail: item.faail || "",
        mafuul: item.mafuul,
        amr: item.amr || "",
        nahyi: item.nahyi || "",
        zamanMakan: item.zamanMakan || "",
        alaat: item.alaat,
      },
    });

    await prisma.simaIImport.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedWordId: word.id,
      },
    });

    published++;
    console.log(`  ✓ ${item.madhi} → Word (${word.id.slice(0, 8)})`);
  }

  console.log(`\nSelesai! Published: ${published}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
