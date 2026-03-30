import { prisma } from "../lib/prisma";

async function run() {
  console.log("🔍 Memulihkan rootWord ke wujud asalnya (unvocalized madhi)...");
  
  const allWords = await prisma.word.findMany({ select: { id: true, madhi: true } });
  const batchUpdates = [];

  for (const word of allWords) {
    const unvocalized = word.madhi.replace(/[\u064B-\u065F\u0670\u0651]/g, "");
    batchUpdates.push({ id: word.id, newRoot: unvocalized });
  }

  let updatedCount = 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < batchUpdates.length; i += BATCH_SIZE) {
    const chunk = batchUpdates.slice(i, i + BATCH_SIZE);
    
    const queries = chunk.map(w => 
      prisma.word.update({
        where: { id: w.id },
        data: { rootWord: w.newRoot }
      })
    );

    await prisma.$transaction(queries);
    updatedCount += chunk.length;
    process.stdout.write(`\r✅ ${updatedCount} / ${batchUpdates.length} kata dipulihkan...`);
  }

  console.log("\nSelesai! Seluruh rootWord telah dikembalikan ke wujud aslinya.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
