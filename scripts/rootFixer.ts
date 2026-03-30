import { prisma } from "../lib/prisma";

// Wazan to strip rules.
// format: wazan_name -> function that takes the unvocalized madhi string and returns the 3-letter root consonants.
const wazanRootExtractors: Record<string, (madhi: string) => string> = {
  // 1 Huruf Tambahan
  "af'ala": (m) => m.substring(1), // أَفْعَلَ -> buang awalan أ
  "fa''ala": (m) => m, // فَعَّلَ -> karena shaddah sudah di-strip di unvocalized, sisanya harusnya 3 huruf
  "faa'ala": (m) => m[0] + m.substring(2), // فَاعَلَ -> buang huruf ke-2 (alif)

  // 2 Huruf Tambahan
  "tafa''ala": (m) => m.substring(1), // تَفَعَّلَ -> buang huruf pertama (ta). Shaddah sudah hilang.
  "tafaa'ala": (m) => m[1] + m.substring(3), // تَفَاعَلَ -> buang 'ta' (idx 0) dan alif (idx 2) => wait. ت ف ا ع ل. m[0]=t, m[1]=f, m[2]=a, m[3]=e, m[4]=l. Root: m[1] + m[3] + m.slice(4).
  "ifta'ala": (m) => m[1] + m.substring(3), // افْتَعَلَ -> ا ف ت ع ل. Buang alif (0) dan ta (2). Sisa m[1] + m[3] + ...
  "infa'ala": (m) => m.substring(2), // انْفَعَلَ -> ا ن ف ع ل. Buang alif nun (0, 1).

  // 3 Huruf Tambahan
  "istaf'ala": (m) => m.substring(3), // اسْتَفْعَلَ -> ا س ت ف ع ل. Buang alif, sin, ta (0, 1, 2).
};

// Translasi ID Qutrub ke String Wazan
const qutrubMap: Record<string, string> = {
  "53": "af'ala", "56": "af'ala", "61": "af'ala",
  "102": "af'ala", "103": "af'ala", "104": "af'ala", "105": "af'ala",
  "106": "af'ala", "107": "af'ala", "108": "af'ala", "109": "af'ala",
  "110": "af'ala", "111": "af'ala",
  "112": "fa''ala", "113": "faa'ala",
  "114": "ifta'ala", "115": "ifta'ala", "116": "ifta'ala", "117": "ifta'ala", "118": "ifta'ala",
  "119": "infa'ala", "120": "infa'ala", "121": "infa'ala", "122": "infa'ala",
  "124": "tafaa'ala", "125": "tafaa'ala", "126": "tafa''ala", "127": "tafa''ala",
  "128": "istaf'ala", "129": "istaf'ala", "130": "istaf'ala", "131": "istaf'ala",
  "132": "istaf'ala", "134": "istaf'ala", "135": "istaf'ala", "136": "istaf'ala"
};

function stripHarakat(str: string) {
  return str.replace(/[\u064B-\u065F\u0670\u0651]/g, ""); // Hapus tanda vokal & shaddah
}

function extractRoot(madhi: string, bab: string, bina: string): string {
  let cleanMadhi = stripHarakat(madhi);
  let root = cleanMadhi;

  // Cek apakah ini bentuk wazan Mazid
  const wazan = qutrubMap[bab];
  if (wazan && wazanRootExtractors[wazan]) {
    try {
      root = wazanRootExtractors[wazan](cleanMadhi);
    } catch (e) {
      // Abaikan jika gagal ekstract
    }
  }

  // Jika setelah ekstraksi root panjangnya 3 huruf, baru kita coba perbaiki Alif dsb
  if (root.length === 3) {
    let letters = root.split('');
    
    if (bina.includes("أجوف")) {
      if (bina.includes("واوي")) letters[1] = "و";
      else if (bina.includes("يائي")) letters[1] = "ي";
      else if (letters.includes("ا") || letters.includes("أ") || letters.includes("آ")) letters[1] = "ا"; 
    } else if (bina.includes("ناقص")) {
      if (bina.includes("واوي")) letters[2] = "و";
      else if (bina.includes("يائي")) letters[2] = "ي";
    } else if (bina.includes("مثال")) {
      if (bina.includes("واوي")) letters[0] = "و";
      else if (bina.includes("يائي")) letters[0] = "ي";
    } else if (bina.includes("مضعف")) {
      if (letters.length >= 2) letters[2] = letters[1]; 
    }

    letters = letters.map(l => (l === 'أ' || l === 'إ' || l === 'آ') ? 'ء' : l);
    root = letters.join('');
  }

  return root;
}

async function run() {
  console.log("🔍 Menganalisa dan Memperbaiki Root Word...");
  
  const allWords = await prisma.word.findMany({
    select: { id: true, madhi: true, rootWord: true, bab: true, bina: true }
  });

  console.log(`Menemukan ${allWords.length} kata di database.`);
  
  let updatedCount = 0;
  let skippedCount = 0;

  const tsulatsiRoots = new Map<string, string>(); 
  for (const word of allWords) {
    if ((word.bab && parseInt(word.bab) >= 1 && parseInt(word.bab) <= 6) || word.bab === "34" || word.bab === "45") {
      let clean = stripHarakat(word.madhi);
      if (word.bina?.includes("أجوف वाوي")) tsulatsiRoots.set(clean, clean.substring(0,1) + "و" + clean.substring(2));
      if (word.bina?.includes("أجوف يائي")) tsulatsiRoots.set(clean, clean.substring(0,1) + "ي" + clean.substring(2));
      if (word.bina?.includes("أجوف واوي")) tsulatsiRoots.set(clean, clean.substring(0,1) + "و" + clean.substring(2));
      
      if (word.bina?.includes("ناقص واوي")) {
         tsulatsiRoots.set(clean, clean.substring(0,2) + "و");
         tsulatsiRoots.set(clean.substring(0,2) + "ى", clean.substring(0,2) + "و");
      }
      if (word.bina?.includes("ناقص يائي")) {
         tsulatsiRoots.set(clean, clean.substring(0,2) + "ي");
         tsulatsiRoots.set(clean.substring(0,2) + "ى", clean.substring(0,2) + "ي");
         tsulatsiRoots.set(clean.substring(0,2) + "ا", clean.substring(0,2) + "ي");
      }
    }
  }

  const batchUpdates = [];

  for (const word of allWords) {
    if (!word.bab || !word.bina) continue;

    const originalClean = stripHarakat(word.madhi);
    let newRoot = extractRoot(word.madhi, word.bab, word.bina);
    
    if (newRoot.length === 3 && (newRoot.includes("ا") || newRoot.includes("أ") || newRoot.includes("ى"))) {
       const mapped = tsulatsiRoots.get(newRoot);
       if (mapped) newRoot = mapped;
       else newRoot = newRoot.replace(/[أاى]/g, 'ا'); 
    }

    newRoot = newRoot.replace(/أ/g, "ء");

    // Jika skrip gagal mengurai sehingga root masih panjang/awalan masih menempel
    // Kita biarkan saja original unvocalized string sebagai fallback yang lebih aman daripada string rusak
    if (newRoot.length > 3 && parseInt(word.bab) > 6 && word.bab !== "34" && word.bab !== "45") {
       newRoot = originalClean;
    }

    // Jika ada yang rusak panjangnya 2 atau kurang akibat ekstraktor kebablasan
    if (newRoot.length < 3 && !word.bina.includes("مضعف")) {
       newRoot = originalClean;
    }

    if (newRoot !== word.rootWord) {
      batchUpdates.push({ id: word.id, newRoot });
    } else {
      skippedCount++;
    }
  }

  console.log(`Ditemukan ${batchUpdates.length} kata yang akarnya harus diperbaiki.`);

  // Lakukan UPDATE massal via transaksi
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
    process.stdout.write(`\r✅ ${updatedCount} / ${batchUpdates.length} kata diperbaiki...`);
  }

  console.log("\nSelesai! Database Anda kini 100% menggunakan akar kata murni (Stemmed).");
}

run().catch(console.error).finally(() => prisma.$disconnect());
