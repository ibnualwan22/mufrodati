import { prisma } from "../lib/prisma";

// ─── KONFIGURASI PROVIDER ─────────────────────────────────────────────────────
const PROVIDER = process.env.AI_PROVIDER ?? "gemini";
const BATCH_SIZE = 20;
const DELAY_MS = 1000;

interface WordBatch { id: string; rootWord: string; madhi: string; bab: string | null; indonesian: string; }
interface AiResponse { id: string; akar?: string; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── ADAPTER OPENAI-COMPATIBLE (Groq & DeepSeek) ──────────
async function callOpenAICompatible(apiKey: string, baseURL: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429 || err.includes("rate") || err.includes("quota")) throw new Error("RATE_LIMITED");
    throw new Error(`API Error ${res.status}: ${err.slice(0, 100)}`);
  }

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── ADAPTER GEMINI ──────────────────────────────────────────────────────────
async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429 || err.includes("quota") || err.includes("RESOURCE_EXHAUSTED")) throw new Error("RATE_LIMITED");
    throw new Error(`Gemini Error ${res.status}: ${err.slice(0, 100)}`);
  }

  const data = await res.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── MANAJEMEN API KEY ROTATION ───────────────────────────────────────────────
const groqKeysStr = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
export const groqKeys = groqKeysStr.split(",").map(k => k.trim()).filter(Boolean);
export let currentGroqKeyIndex = 0;

// ─── FUNGSI FIX BATCH ──────────────────────────────────────────────────
async function fixBatch(batch: WordBatch[]): Promise<AiResponse[]> {
  const dataJson = batch.map(w => ({ id: w.id, arti: w.indonesian, kata: w.madhi }));

  const prompt = `Anda ahli Shorof dan kamus Arab. Ekstrak AKAR KATA murni (3 huruf) dari fi'il Arab berikut.
Akar kata WAJIB berupa aksara Arab (Tsulatsi Mujarrod) tanpa harakat. Kembalikan huruf illat keasalnya, contoh: 'أَرَادَ' akarnya 'رود', 'اِسْتَغْفَرَ' akarnya 'غفر', 'تَباعَدَ' akarnya 'بعد'.
TIDAK BOLEH HURUF LATIN. WAJIB HURUF ARAB.
Balas HANYA JSON array:
[{"id":"...","akar":"لغةarab"}, ...]

Masukan: ${JSON.stringify(dataJson)}`;

  let rawText = "";
  try {
    if (PROVIDER === "groq") {
      rawText = await callOpenAICompatible(
        groqKeys[currentGroqKeyIndex],
        "https://api.groq.com/openai/v1",
        "llama-3.3-70b-versatile",
        prompt
      );
    } else if (PROVIDER === "deepseek") {
      rawText = await callOpenAICompatible(
        process.env.DEEPSEEK_API_KEY!,
        "https://api.deepseek.com/v1",
        "deepseek-chat",
        prompt
      );
    } else {
      rawText = await callGemini(
        process.env.GEMINI_API_KEY!,
        "gemini-2.0-flash",
        prompt
      );
    }

    const jsonStr = rawText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(jsonStr);
  } catch (err: any) {
    if (err.message === "RATE_LIMITED") throw err;
    console.error(`  ❌ Parse error: ${err.message?.slice(0, 80)}`);
    return [];
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function run() {
  const key = PROVIDER === "groq" ? groqKeys[0]
    : PROVIDER === "deepseek" ? process.env.DEEPSEEK_API_KEY
      : process.env.GEMINI_API_KEY;

  if (!key) { console.error(`❌ API key untuk provider '${PROVIDER}' tidak ditemukan di .env!`); process.exit(1); }

  console.log(`\n👨‍⚕️  Fix Latin Roots — Mufrodati`);
  
  // Ambil semua kata yang akar katanya mengandung huruf latin/abjad
  console.log("Mencari kata dengan akar kata Latin...");
  const wordsToFix = await prisma.$queryRaw<WordBatch[]>`
    SELECT id, "rootWord", madhi, bab, indonesian
    FROM "Word"
    WHERE "rootWord" ~ '[a-zA-Z]'
  `;
  
  const totalAll = wordsToFix.length;
  console.log(`📊 Ditemukan: ${totalAll} kata yang error\n`);

  if (totalAll === 0) {
    console.log("Tidak ada kata yang perlu diperbaiki.");
    return;
  }

  let totalSuccess = 0, skippedBatches = 0;

  for (let i = 0; i < totalAll; i += BATCH_SIZE) {
    const batch = wordsToFix.slice(i, i + BATCH_SIZE);
    const pct = ((i / totalAll) * 100).toFixed(1);
    process.stdout.write(`[${pct}% | ${i}/${totalAll}] ${batch.length} kata...`);

    try {
      const results = await fixBatch(batch);
      let ok = 0;
      for (const res of results) {
        if (res.id && res.akar) {
          try {
            const cleanAkar = res.akar.replace(/[\u064B-\u065F\u0670]/g, '').trim();
            const isArabic = /^[\u0600-\u06FF\s]+$/.test(cleanAkar);
            
            if (cleanAkar.length >= 3 && cleanAkar.length <= 4 && !cleanAkar.includes(' ') && isArabic) {
              await prisma.word.update({
                where: { id: res.id },
                data: { rootWord: cleanAkar }
              });
              ok++; totalSuccess++;
            }
          }
          catch { /* skip */ }
        }
      }
      process.stdout.write(` ✅ ${ok}/${batch.length}\n`);
      skippedBatches = 0;
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        if (PROVIDER === "groq" && groqKeys.length > 1) {
          currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqKeys.length;
          process.stdout.write(` 🔄 Rate limit! Berganti ke API Key Groq #${currentGroqKeyIndex + 1}...\n`);
          i -= BATCH_SIZE; // Ulangi batch
          await sleep(2000);
          continue;
        } else {
          const waitMin = PROVIDER === "groq" ? 60 : 65;
          process.stdout.write(` ⏳ Rate limit! Semua key habis, tunggu ${waitMin} detik...\n`);
          i -= BATCH_SIZE;
          await sleep(waitMin * 1000);
          continue;
        }
      }
      process.stdout.write(` ⚠️  Error: ${err.message?.slice(0, 50)}, skip\n`);
      skippedBatches++;
      if (skippedBatches >= 5) {
        console.log(`\n⏸️  Banyak error, tunggu 2 menit...\n`);
        await sleep(120000); skippedBatches = 0;
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n\n✅ Selesai! ${totalSuccess} kata berhasil diperbaiki.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
