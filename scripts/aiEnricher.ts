import { prisma } from "../lib/prisma";

// ─── KONFIGURASI PROVIDER ─────────────────────────────────────────────────────
// Pilih salah satu provider dengan mengset variabel di .env:
//   Provider 1 — Groq (GRATIS, 14.400 req/hari): https://console.groq.com/keys
//     GROQ_API_KEY=gsk_...
//     AI_PROVIDER=groq
//
//   Provider 2 — DeepSeek (murah, akurat): https://platform.deepseek.com/api_keys
//     DEEPSEEK_API_KEY=sk-...
//     AI_PROVIDER=deepseek
//
//   Provider 3 — Google Gemini (default)
//     GEMINI_API_KEY=AIza...
//     AI_PROVIDER=gemini
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER     = process.env.AI_PROVIDER ?? "gemini";
const BATCH_SIZE   = 20;
const DELAY_MS     = 8000; // 8 detik untuk mencegah Rate Limit Groq (6000 TPM limit)

interface WordBatch  { id: string; rootWord: string; madhi: string; bab: string | null; }
interface AiResponse { id: string; arti: string; akar?: string; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── ADAPTER OPENAI-COMPATIBLE (Groq & DeepSeek memakai API yg sama) ──────────
async function callOpenAICompatible(apiKey: string, baseURL: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
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

// ─── FUNGSI TERJEMAH BATCH ──────────────────────────────────────────────────
async function enrichBatch(batch: WordBatch[]): Promise<AiResponse[]> {
  const dataJson = batch.map(w => ({ id: w.id, kata: w.madhi, akar: w.rootWord }));

  const prompt = `Anda ahli Shorof dan kamus Arab-Indonesia yang akurat. Berikan arti fi'il Arab dalam Bahasa Indonesia, dan ekstraksi AKAR KATA (Root Word) murni 3 HURUF ASLI-nya.
Aturan Arti: singkat 2-4 kata, awalan me-/ber-/ter- yang tepat.
Aturan Akar: wajib berbentuk 3 huruf (Tsulatsi Mujarrod) tanpa harakat. Kembalikan huruf illat keasalnya, contoh: 'أَرَادَ' akarnya 'رود', 'اِسْتَغْفَرَ' akarnya 'غفر'.
WAJIB balas semua ${batch.length} item.

Masukan: ${JSON.stringify(dataJson)}

Balas HANYA JSON array (tanpa markdown):
[{"id":"...","arti":"...","akar":"..."}, ...]`;

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
      // Gemini
      rawText = await callGemini(
        process.env.GEMINI_API_KEY!,
        "gemini-2.0-flash",
        prompt
      );
    }

    const jsonStr = rawText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed: AiResponse[] = JSON.parse(jsonStr);

    // Retry kata yang terlewat
    const returned = new Set(parsed.map(r => r.id));
    for (const word of batch.filter(w => !returned.has(w.id))) {
      try {
        let retryText = "";
        const retryPrompt = `Berikan arti Indonesia singkat dan akar kata murni (3 huruf) dari fi'il Arab: ${word.madhi} (akar asalnya/unvocalized kotor: ${word.rootWord}). Balas HANYA JSON: {"arti":"...", "akar":"..."}`;
        if (PROVIDER === "groq")     retryText = await callOpenAICompatible(groqKeys[currentGroqKeyIndex], "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", retryPrompt);
        else if (PROVIDER === "deepseek") retryText = await callOpenAICompatible(process.env.DEEPSEEK_API_KEY!, "https://api.deepseek.com/v1", "deepseek-chat", retryPrompt);
        else retryText = await callGemini(process.env.GEMINI_API_KEY!, "gemini-2.0-flash", retryPrompt);
        const t = retryText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
        try {
          const resObj = JSON.parse(t);
          if (resObj.arti) parsed.push({ id: word.id, arti: resObj.arti, akar: resObj.akar });
        } catch { /* skip */ }
      } catch { /* skip */ }
    }
    return parsed;
  } catch (err: any) {
    if (err.message === "RATE_LIMITED") throw err;
    console.error(`  ❌ Parse error: ${err.message?.slice(0, 80)}`);
    return [];
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function run() {
  const key = PROVIDER === "groq"     ? groqKeys[0]
            : PROVIDER === "deepseek" ? process.env.DEEPSEEK_API_KEY
            :                           process.env.GEMINI_API_KEY;

  if (!key) { console.error(`❌ API key untuk provider '${PROVIDER}' tidak ditemukan di .env!`); process.exit(1); }

  const totalAll = await prisma.word.count();
  console.log(`\n🚀 AI Enricher — Mufrodati`);
  console.log(`🤖 Provider: ${PROVIDER.toUpperCase()} | ${BATCH_SIZE} kata/req | ${DELAY_MS/1000}s delay`);
  console.log(`📊 Total kata DB: ${totalAll}\n`);

  let totalSuccess = 0, skippedBatches = 0, offset = 0;

  while (true) {
    const remaining = await prisma.word.count({ where: { indonesian: "" } });
    if (remaining === 0) break;

    const batch = await prisma.word.findMany({
      where: { indonesian: "" },
      select: { id: true, rootWord: true, madhi: true, bab: true },
      take: BATCH_SIZE, skip: offset
    });

    if (batch.length === 0) { if (offset > 0) { offset = 0; continue; } break; }

    const filled = totalAll - remaining;
    const pct    = ((filled / totalAll) * 100).toFixed(1);
    process.stdout.write(`[${pct}% | ${filled}/${totalAll}] ${batch.length} kata...`);

    try {
      const results = await enrichBatch(batch);
      let ok = 0;
      for (const res of results) {
        if (res.id && res.arti?.length > 0) {
          try { 
            const dataToUpdate: any = { indonesian: res.arti };
            // Jika LLM mengirimkan akar 3 huruf (atau max 4 untuk rubai)
            if (res.akar && res.akar.length >= 3 && res.akar.length <= 4 && !res.akar.includes(' ')) {
              dataToUpdate.rootWord = res.akar;
            }
            await prisma.word.update({ where: { id: res.id }, data: dataToUpdate }); 
            ok++; totalSuccess++; 
          }
          catch { /* skip */ }
        }
      }
      process.stdout.write(` ✅ ${ok}/${batch.length}\n`);
      offset = 0; skippedBatches = 0;
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        if (PROVIDER === "groq" && groqKeys.length > 1) {
          currentGroqKeyIndex = (currentGroqKeyIndex + 1) % groqKeys.length;
          process.stdout.write(` 🔄 Rate limit! Berganti ke API Key Groq #${currentGroqKeyIndex + 1}...\n`);
          await sleep(2000); // 2 detik jeda aman sebelum nyoba key baru
          continue; // Ulangi batch yang sama seketika
        } else {
          const waitMin = PROVIDER === "groq" ? 60 : 65;
          process.stdout.write(` ⏳ Rate limit! Semua key habis, tunggu ${waitMin} detik...\n`);
          await sleep(waitMin * 1000);
          continue;
        }
      }
      process.stdout.write(` ⚠️  Error: ${err.message?.slice(0,50)}, skip\n`);
      offset += BATCH_SIZE; skippedBatches++;
      if (skippedBatches >= 5) {
        console.log(`\n⏸️  Banyak error, tunggu 2 menit...\n`);
        await sleep(120000); offset = 0; skippedBatches = 0;
      }
    }

    await sleep(DELAY_MS);
  }

  const sisa = await prisma.word.count({ where: { indonesian: "" } });
  console.log(`\n\n✅ Selesai! ${totalSuccess} kata berhasil sesi ini.`);
  console.log(`📊 Sisa kosong: ${sisa} dari ${totalAll}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
