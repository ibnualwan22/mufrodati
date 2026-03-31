import { prisma } from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

const PROVIDER = process.env.AI_PROVIDER ?? "gemini";
const BATCH_SIZE = 20;

const groqKeysStr = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const groqKeys = groqKeysStr.split(",").map(k => k.trim()).filter(Boolean);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function callOpenAICompatible(apiKey: string, baseURL: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 }),
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`);
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini Error ${res.status}: ${await res.text()}`);
  const data = await res.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function run() {
  console.log("Mencari kata di DB yang panjang rootWord-nya salah (selain 3-4 huruf)...");
  
  const words = await prisma.word.findMany({
    where: { indonesian: { not: "" } },
    select: { id: true, madhi: true, rootWord: true },
  });

  const exactBadRoots = words.filter(w => {
    const clen = w.rootWord.replace(/[\u064B-\u065F\u0670]/g, '').length;
    return clen > 4 || clen < 3;
  });

  if (exactBadRoots.length === 0) {
    console.log("🎉 Tidak ada kata dengan format rootWord yang salah! Semua sudah bersih.");
    return;
  }

  console.log(`Ditemukan ${exactBadRoots.length} kata dengan rootWord bermasalah. Memulai proses perbaikan...`);
  
  let successCount = 0;

  for (let i = 0; i < exactBadRoots.length; i += BATCH_SIZE) {
    const batch = exactBadRoots.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${i / BATCH_SIZE + 1} (${batch.length} item)... `);

    const dataJson = batch.map(w => ({ id: w.id, kata: w.madhi }));
    const prompt = `Anda ahli Shorof Arab. Ekstrak AKAR KATA murni (3 huruf - Tsulatsi Mujarrod) dari fi'il berikut.
Aturan: Akar WAJIB 3 huruf saja tanpa harakat. Kembalikan huruf illat, contoh: 'أَرَادَ'->'رود', 'تَباعَدَ'->'بعد'.
HANYA kembalikan array JSON.

Masukan: ${JSON.stringify(dataJson)}

Balas HANYA array: [{"id":"...","akar":"..."}]`;

    try {
      let rawText = "";
      let success = false;
      let currentGroqKeyIndex = 0;

      while (!success) {
        try {
          if (PROVIDER === "groq") {
            rawText = await callOpenAICompatible(groqKeys[currentGroqKeyIndex], "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", prompt);
          } else if (PROVIDER === "deepseek") {
            rawText = await callOpenAICompatible(process.env.DEEPSEEK_API_KEY!, "https://api.deepseek.com/v1", "deepseek-chat", prompt);
          } else {
            rawText = await callGemini(process.env.GEMINI_API_KEY!, "gemini-2.0-flash", prompt);
          }
          success = true;
        } catch (err: any) {
          if (err.message.includes("429") && PROVIDER === "groq" && currentGroqKeyIndex < groqKeys.length - 1) {
            currentGroqKeyIndex++;
            console.log(`\n⏳ Rate limit. Berganti ke API Key Groq #${currentGroqKeyIndex + 1}...`);
            await sleep(2000);
          } else {
            throw err;
          }
        }
      }

      const jsonStr = rawText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(jsonStr);

      for (const res of parsed) {
        if (!res.akar) continue;
        const cleanAkar = res.akar.replace(/[\u064B-\u065F\u0670]/g, '').trim();
        if (cleanAkar.length >= 3 && cleanAkar.length <= 4 && !cleanAkar.includes(' ')) {
          await prisma.word.update({
            where: { id: res.id },
            data: { rootWord: cleanAkar }
          });
          successCount++;
        }
      }
      console.log(`✅ OK`);
    } catch (err: any) {
      console.log(`❌ Error: ${err.message.slice(0, 50)}`);
    }

    await sleep(2000); // delay agar tidak kena rate limit
  }

  console.log(`\nSelesai! Berhasil memperbaiki ${successCount} kata.`);
}

run().finally(() => prisma.$disconnect());
