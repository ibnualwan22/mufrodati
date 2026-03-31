import { prisma } from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

const PROVIDER = process.env.AI_PROVIDER ?? "gemini";
const groqKeysStr = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const groqKeys = groqKeysStr.split(",").map(k => k.trim()).filter(Boolean);

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

// Hanya untuk mengetes AI mengekstrak akar kata murni (membetulkan akar kata yang salah)
async function run() {
  console.log("Mencari kata di DB yang sudah diterjemahkan tapi rootWord-nya salah (panjang > 4 karakter saat harakat dihapus)...");
  
  const words = await prisma.word.findMany({
    where: { indonesian: { not: "" } },
    select: { id: true, madhi: true, rootWord: true, indonesian: true },
    take: 500
  });

  const wordsWithBadRoots = words.filter(w => {
    const cleanCurrentRoot = w.rootWord.replace(/[\u064B-\u065F\u0670]/g, '');
    return cleanCurrentRoot.length > 3 && cleanCurrentRoot !== w.madhi.replace(/[\u064B-\u065F\u0670]/g, ''); // Ambil yg bukan 3 huruf
  }).slice(0, 5); // Ambil 5 kata pertama untuk dites ulang

  if (wordsWithBadRoots.length === 0) {
    console.log("Tidak ditemukan kata dengan rootWord bermasalah.");
    return;
  }

  console.log(`Ditemukan ${wordsWithBadRoots.length} kata untuk dites:`);
  console.log(wordsWithBadRoots.map(w => ({ madhi: w.madhi, rootWordLama: w.rootWord })));

  // Hapus "akar" lama, biarkan AI berpikir dari "kata" (madhi) saja.
  const dataJson = wordsWithBadRoots.map(w => ({ id: w.id, kata: w.madhi }));

  const prompt = `Anda ahli Shorof bahasa Arab. Ekstrak AKAR KATA (Root Word) murni 3 HURUF ASLI-nya (Tsulatsi Mujarrod) dari daftar fi'il berikut.
Aturan Akar: WAJIB 3 huruf saja (tanpa harakat). Kembalikan huruf illat keasalnya, contoh: 'أَرَادَ' akarnya 'رود', 'تَباعَدَ' akarnya 'بعد'.
TIDAK perlu arti (karena sudah ada).

Masukan: ${JSON.stringify(dataJson)}

Balas HANYA JSON array (tanpa markdown), format:
[{"id":"...","akar":"..."}, ...]`;

  console.log("\nMemanggil AI...");
  let rawText = "";
  if (PROVIDER === "groq") {
    rawText = await callOpenAICompatible(groqKeys[0], "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", prompt);
  } else if (PROVIDER === "deepseek") {
    rawText = await callOpenAICompatible(process.env.DEEPSEEK_API_KEY!, "https://api.deepseek.com/v1", "deepseek-chat", prompt);
  } else {
    rawText = await callGemini(process.env.GEMINI_API_KEY!, "gemini-2.0-flash", prompt);
  }

  const jsonStr = rawText.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(jsonStr);

  console.log("\n====== HASIL DARI AI ======");
  
  for (const res of parsed) {
    const original = wordsWithBadRoots.find(w => w.id === res.id);
    const cleanAkar = res.akar.replace(/[\u064B-\u065F\u0670]/g, ''); // Simulasi filter baru
    
    let info = `[KATA: ${original?.madhi}] | RootLama: ${original?.rootWord} => RootBaru: ${res.akar} | `;
    if (cleanAkar.length >= 3 && cleanAkar.length <= 4) {
      info += `✅ Valid (Clean Length: ${cleanAkar.length})`;
    } else {
      info += `❌ Invalid (Clean Length: ${cleanAkar.length})`;
    }
    console.log(info);
  }
}

run().finally(() => prisma.$disconnect());
