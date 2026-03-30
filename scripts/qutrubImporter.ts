import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { generateSemuaTasrif } from '../lib/shorof/tasrifGenerator';

function getRootAndType(
  unmarked: string, 
  len: number, 
  salim: string, 
  weak: string
): { root: string, jenisFiil: string } {
  let jenisFiil = 'Tsulatsi Mujarrod';
  if (len === 4) {
    jenisFiil = 'Tsulatsi Mazid / Ruba\'i Mujarrod';
  } else if (len > 4) {
    jenisFiil = `Tsulatsi Mazid (${len} huruf)`;
  }

  // Extract Root Dasar (Best Effort untuk fase 1)
  let rootLetters = unmarked.split('');
  
  if (len === 3 && salim.includes('مضعف') && rootLetters.length === 2) {
    rootLetters.push(rootLetters[1]); // Mudha'af menduplikasi huruf terakhir
  }

  return { root: rootLetters.join(''), jenisFiil };
}

async function run() {
  const filePath = path.join(process.cwd(), 'qutrub_tmp/data/Classified_verbs.csv');
  console.log(`Membaca data dari: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error("File Classified_verbs.csv tidak ditemukan. Pastikan repo qutrub sudah di-clone.");
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Membaca ${lines.length} baris data...`);

  const words = [];
  
  // Lewati baris pertama (header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split('\t');
    if (cols.length < 11) continue;

    const verb = cols[1];
    const trans = cols[2];
    const tableBase = cols[3];
    const unmarked = cols[5];
    const len = parseInt(cols[8]) || 3;
    const salim = cols[9];
    const weak = cols[10];

    const transitiveMap: Record<string, string> = { 
      'ل': 'Lazim', 
      'م': 'Muta\'addi', 
      'ل/م': 'Lazim & Muta\'addi' 
    };
    const transitive = transitiveMap[trans] || trans;

    const bina = `${salim} (${weak})`;
    const { root, jenisFiil } = getRootAndType(unmarked, len, salim, weak);

    let parsedBab: string | 1 | 2 | 3 | 4 | 5 | 6 = tableBase;
    const numBab = parseInt(tableBase);

    // Translasi ID Qutrub ke String Wazan (Peta Utama)
    const qutrubMap: Record<string, string> = {
      // Tsulatsi Mazid (1 huruf)
      "53": "af'ala", "56": "af'ala", "61": "af'ala", "112": "fa''ala", "113": "faa'ala",
      "102": "af'ala", "103": "af'ala", "104": "af'ala", "105": "af'ala", "106": "af'ala",
      "107": "af'ala", "108": "af'ala", "109": "af'ala", "110": "af'ala", "111": "af'ala",
      // Tsulatsi Mazid (2 huruf)
      "124": "tafaa'ala", "125": "tafaa'ala", "126": "tafa''ala", "127": "tafa''ala",
      "114": "ifta'ala", "115": "ifta'ala", "116": "ifta'ala", "117": "ifta'ala", "118": "ifta'ala",
      "119": "infa'ala", "120": "infa'ala", "121": "infa'ala", "122": "infa'ala",
      // Tsulatsi Mazid (3 huruf)
      "128": "istaf'ala", "129": "istaf'ala", "130": "istaf'ala", "131": "istaf'ala",
      "132": "istaf'ala", "134": "istaf'ala", "135": "istaf'ala", "136": "istaf'ala"
    };

    if (qutrubMap[tableBase]) {
      parsedBab = qutrubMap[tableBase];
    } else if (numBab >= 1 && numBab <= 6 && len === 3) {
      // Tsulatsi Mujarrod murni
      parsedBab = numBab as (1|2|3|4|5|6);
    } else {
      parsedBab = tableBase; // Biarkan string, biarkan engine mencoba fallback
    }

    let tasrifFields = {
      madhi: verb,
      mudhari: '',
      masdar: '',
      masdarMim: '',
      faail: '',
      mafuul: '',
      amr: '',
      nahyi: '',
      zamanMakan: '',
      alaat: ''
    };

    try {
      const t = generateSemuaTasrif(root, "", parsedBab, "", { 
        lazim: transitive === 'Lazim' 
      });
      if (t.mudhari) {
        tasrifFields = {
          madhi: t.madhi || verb,
          mudhari: t.mudhari,
          masdar: t.masdar,
          masdarMim: t.masdarMim,
          faail: t.faail,
          mafuul: t.mafuul || '',
          amr: t.amr,
          nahyi: t.nahyi,
          zamanMakan: t.zamanMakan,
          alaat: t.alaat || ''
        };
      }
    } catch (e) {
      // Fallback jika belum di-cover engine
    }

    words.push({
      rootWord: root,
      indonesian: '',
      bab: tableBase,
      bina,
      transitive,
      jenisFiil,
      ...tasrifFields
    });

    // Untuk full-import Fase 4, LIMIT DIHAPUS.
    // Script akan memproses semua puluhan ribu data.
  }

  console.log(`Menyiapkan ${words.length} data untuk dimasukkan ke Prisma (Mode PRODUCTION)...`);
  
  let successCount = 0;
  const BATCH_SIZE = 1000;
  
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    try {
      const result = await prisma.word.createMany({
        data: batch,
        skipDuplicates: true, // Akan men-skip data yang sudah ada berdasarkan Constraints (jangan lupa set @@unique jika perlu)
      });
      successCount += result.count;
      console.log(`Batch ${i/BATCH_SIZE + 1}: ${result.count} data berhasil dimasukkan.`);
    } catch (err: any) {
      console.error(`Gagal insert batch ${i/BATCH_SIZE + 1}: ${err.message}`);
    }
  }

  console.log(`✅ Selesai! Berhasil menyimpan ${successCount} kata baru ke database.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
