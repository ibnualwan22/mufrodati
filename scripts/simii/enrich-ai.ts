/**
 * scripts/simii/enrich-ai.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LANGKAH 2: AI enrichment via Rizal (Agent Hub)
 *
 * Cara pakai:
 *   npx tsx scripts/simii/enrich-ai.ts [batchSize]
 *
 * Alur:
 *   1. Ambil DRAFT dari database
 *   2. Kirim request ke Rizal via Agent Hub (#umum)
 *   3. Tunggu respons Rizal (polling, timeout 5 menit)
 *   4. Parse JSON dari respons, update database → AI_DONE
 *
 * Catatan:
 *   - Script ini harus dijalankan di VM private (akses ke Agent Hub lokal)
 *   - Token hub dibaca dari /home/ubuntu/.agent-hub-token
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const HUB_URL = "http://127.0.0.1:3200";
const HUB_TOKEN = readFileSync("/home/ubuntu/.agent-hub-token", "utf-8").trim();
const CHANNEL = "#simai-kerja"; // Channel privat, Rizal kerja di belakang layar
const TIMEOUT_MS = 5 * 60 * 1000; // 5 menit
const POLL_INTERVAL_MS = 10 * 1000; // 10 detik

interface EnrichResult {
  indonesian: string;
  mudhari: string;
  masdar: string[];
  faail: string;
  mafuul: string | null;
  amr: string;
  nahyi: string;
  zamanMakan: string;
  alaat: string | null;
  bina: string;
  jenisFiil: string;
  babTerverifikasi: string | null;
  akarTerverifikasi: string | null;
  perbaikan: string | null;
  aiConfidence: number;
  aiNotes: string | null;
}

async function hubPost(channel: string, isi: string): Promise<string> {
  const res = await fetch(`${HUB_URL}/api/pesan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HUB_TOKEN}`,
    },
    body: JSON.stringify({ channel, isi }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

async function hubGetLatest(channel: string, afterId: string): Promise<any[]> {
  const res = await fetch(
    `${HUB_URL}/api/channel/${encodeURIComponent(channel)}`,
    { headers: { "Authorization": `Bearer ${HUB_TOKEN}` } }
  );
  const data = await res.json() as { pesan: any[] };
  const msgs = data.pesan || [];
  // Ambil pesan setelah afterId dari rizal-batagor
  const idx = msgs.findIndex((m: any) => m.id === afterId);
  return msgs.slice(idx + 1).filter((m: any) => m.pengirim === "rizal-batagor");
}

function buatPrompt(entry: {
  madhi: string | null;
  rootWord: string | null;
  bab: string | null;
  transitive: string | null;
}): string {
  return `Rizal, tolong proses data kata kerja Arab berikut untuk database kamus.

Data awal dari Qutrub (PERLU DIVERIFIKASI DAN DIPERBAIKI):
- Fi'il madhi: ${entry.madhi}
- Akar kata (klaim Qutrub): ${entry.rootWord}
- Bab (klaim Qutrub): ${entry.bab}
- Transitivitas: ${entry.transitive}

PERAN ANDA:
1. VERIFIKASI: Cek apakah akar kata, bab, dan transitivitas dari Qutrub sudah benar
2. PERBAIKI: Jika ada yang salah, betulkan dengan yang benar
3. LENGKAPI: Isi semua field yang kosong

ATURAN SHOROF YANG HARUS DIIKUTI:
- Akar kata: 3 huruf (tsulatsi) atau 4 huruf (ruba'i). Perhatikan huruf ilat!
  * قَالَ → ق و ل (bukan قل!)
  * بَاعَ → ب ي ع (bukan بع!)
  * Huruf ilat: ا (alif), و (wawu), ي (ya) — alif selalu berasal dari wawu atau ya
- Bab mujarrad: 1-6 (untuk tsulatsi). Tentukan dari harakat 'ain fi'il madhi vs mudhari'
- Bab mazid: pakai nama wazan (af'ala, fa''ala, faa'ala, tafa''ala, tafaa'ala, ifta'ala, infa'ala, istaf'ala)
- Bina': Shahih Salim, Mahmuz, Mudha'af, Mitsal, Ajwaf, Naqish, Lafif
- Kaidah i'lal: terapkan dengan benar (naql, hadzf, ibdal, idghom)

Tolong berikan dalam format JSON (bungkus dengan \`\`\`json):
\`\`\`json
{
  "indonesian": "arti dalam bahasa Indonesia yang natural",
  "mudhari": "bentuk mudhari' dengan harakat lengkap",
  "masdar": ["masdar1", "masdar2"],
  "faail": "isim fa'il dengan harakat",
  "mafuul": "isim maf'ul atau null jika lazim",
  "amr": "fi'il amr dengan harakat",
  "nahyi": "fi'il nahyi dengan harakat",
  "zamanMakan": "isim zaman/makan",
  "alaat": "isim alat atau null",
  "bina": "jenis bina' yang benar",
  "jenisFiil": "Tsulatsi Mujarrod / Tsulatsi Mazid / Ruba'i Mujarrod / Ruba'i Mazid",
  "babTerverifikasi": "bab yang sudah diverifikasi/diperbaiki (contoh: Bab 1 / af'ala)",
  "akarTerverifikasi": "akar kata yang sudah diverifikasi (contoh: ق و ل)",
  "perbaikan": "jelaskan apa yang diperbaiki dari data Qutrub, atau null jika sudah benar",
  "aiConfidence": 0.95,
  "aiNotes": "catatan jika ada keraguan"
}
\`\`\`

PENTING: Jika data Qutrub salah, JANGAN ikuti. Berikan yang benar dan jelaskan di field "perbaikan".`;
}

function parseJsonDariRespons(isi: string): EnrichResult | null {
  // Cari JSON dalam code block
  const match = isi.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = match ? match[1] : isi;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return parsed as EnrichResult;
  } catch {
    return null;
  }
}

async function enrichWithAI(entry: {
  id: string;
  madhi: string | null;
  rootWord: string | null;
  bab: string | null;
  transitive: string | null;
}): Promise<EnrichResult> {
  const prompt = buatPrompt(entry);

  // Kirim ke Rizal
  const msgId = await hubPost(CHANNEL, prompt);
  console.log(`    → Pesan terkirim (${msgId}), menunggu Rizal...`);

  // Polling untuk respons
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const responses = await hubGetLatest(CHANNEL, msgId);
    if (responses.length > 0) {
      const latest = responses[responses.length - 1];
      const hasil = parseJsonDariRespons(latest.isi);

      if (hasil) {
        return hasil;
      } else {
        console.log(`    ⚠ Respons Rizal tidak mengandung JSON valid, coba lagi...`);
      }
    }
  }

  throw new Error("Timeout menunggu respons Rizal (5 menit)");
}

async function main() {
  const batchSize = parseInt(process.argv[2] || "10");

  const drafts = await prisma.simaIImport.findMany({
    where: { status: "DRAFT" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  if (drafts.length === 0) {
    console.log("Tidak ada DRAFT yang perlu diproses.");
    return;
  }

  console.log(`Memproses ${drafts.length} entri via Rizal...\n`);

  let sukses = 0;
  let gagal = 0;

  for (const draft of drafts) {
    console.log(`  [${sukses + gagal + 1}/${drafts.length}] ${draft.madhi}`);
    try {
      const hasil = await enrichWithAI({
        id: draft.id,
        madhi: draft.madhi,
        rootWord: draft.rootWord,
        bab: draft.bab,
        transitive: draft.transitive,
      });

      await prisma.simaIImport.update({
        where: { id: draft.id },
        data: {
          indonesian: hasil.indonesian,
          mudhari: hasil.mudhari,
          masdar: hasil.masdar,
          faail: hasil.faail,
          mafuul: hasil.mafuul,
          amr: hasil.amr,
          nahyi: hasil.nahyi,
          zamanMakan: hasil.zamanMakan,
          alaat: hasil.alaat,
          bina: hasil.bina,
          jenisFiil: hasil.jenisFiil,
          // Jika Rizal memperbaiki bab/akar, pakai versi terverifikasi
          bab: hasil.babTerverifikasi || draft.bab,
          rootWord: hasil.akarTerverifikasi || draft.rootWord,
          aiConfidence: hasil.aiConfidence,
          aiNotes: hasil.perbaikan
            ? `[PERBAIKAN] ${hasil.perbaikan}${hasil.aiNotes ? ` | ${hasil.aiNotes}` : ""}`
            : hasil.aiNotes,
          aiModel: "rizal-batagor",
          status: "AI_DONE",
        },
      });

      sukses++;
      console.log(`    ✓ → AI_DONE (confidence: ${hasil.aiConfidence})\n`);
    } catch (e: any) {
      gagal++;
      console.log(`    ✗ Gagal: ${e.message}\n`);
    }
  }

  console.log(`\nSelesai! Sukses: ${sukses}, Gagal: ${gagal}`);
  const sisa = await prisma.simaIImport.count({ where: { status: "DRAFT" } });
  console.log(`Sisa DRAFT: ${sisa}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
