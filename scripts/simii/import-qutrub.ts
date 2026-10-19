/**
 * scripts/simii/import-qutrub.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LANGKAH 1: Import data dari Qutrub ke SimaIImport (status DRAFT)
 *
 * Cara pakai:
 *   npx tsx scripts/simii/import-qutrub.ts [limit] [offset]
 *
 * Contoh:
 *   npx tsx scripts/simii/import-qutrub.ts 100     # import 100 kata pertama
 *   npx tsx scripts/simii/import-qutrub.ts 100 100 # import 100 kata, mulai dari offset 100
 *
 * Fitur:
 *   - Skip kata yang sudah ada (berdasarkan madhi + bab)
 *   - Buat batchId otomatis: YYYY-MM-DD-NNN
 *   - Bisa diulang (idempotent)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface QutrubEntry {
  verb: string;
  root: string;
  bab: number;
  transitive: string; // 'م' = muta'addi, 'ل' = lazim, 'ك' = keduanya
  haraka: string;
}

function transitiveLabel(t: string): string {
  if (t === "م") return "Muta'addi";
  if (t === "ل") return "Lazim";
  if (t === "ك") return "Keduanya";
  return t;
}

async function main() {
  const limit = parseInt(process.argv[2] || "50");
  const offset = parseInt(process.argv[3] || "0");

  console.log(`Import Qutrub: limit=${limit}, offset=${offset}`);

  // Ambil data dari Qutrub via Python (cari path otomatis)
  const pyCode = `
import libqutrub, os, sys
sys.path.insert(0, os.path.dirname(libqutrub.__file__))
from triverbtable import TriVerbTable
import json
entries = list(TriVerbTable.values())
print(json.dumps(entries[${offset}:${offset}+${limit}]))
`;
  const output = execSync(`python3 -c "${pyCode.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });

  const entries: QutrubEntry[] = JSON.parse(output);
  console.log(`Dapat ${entries.length} entri dari Qutrub`);

  // Buat batchId
  const today = new Date().toISOString().slice(0, 10);
  const existingBatches = await prisma.simaIImport.findMany({
    where: { batchId: { startsWith: today } },
    select: { batchId: true },
    distinct: ["batchId"],
  });
  const batchNum = String(existingBatches.length + 1).padStart(3, "0");
  const batchId = `${today}-${batchNum}`;
  console.log(`Batch ID: ${batchId}`);

  let imported = 0;
  let skipped = 0;

  for (const e of entries) {
    // Cek duplikat: sudah ada di SimaIImport atau Word?
    const existingImport = await prisma.simaIImport.findFirst({
      where: { madhi: e.verb, bab: `Bab ${e.bab}` },
    });
    const existingWord = await prisma.word.findFirst({
      where: { madhi: e.verb, bab: `Bab ${e.bab}` },
    });

    if (existingImport || existingWord) {
      skipped++;
      continue;
    }

    await prisma.simaIImport.create({
      data: {
        batchId,
        qutrubRaw: e as any,
        madhi: e.verb,
        rootWord: e.root,
        bab: `Bab ${e.bab}`,
        transitive: transitiveLabel(e.transitive),
        status: "DRAFT",
      },
    });
    imported++;
  }

  console.log(`\nSelesai! Imported: ${imported}, Skipped (duplikat): ${skipped}`);
  console.log(`Batch: ${batchId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
