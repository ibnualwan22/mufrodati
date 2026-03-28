/**
 * lib/shorof/tasrifGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto-generator Tasrif Istilahi untuk satu entri kosakata.
 *
 * Alur kerja:
 *   1. Terima (akarKata, bab, indonesian, masdarAsli)
 *   2. Deteksi bina' otomatis dari akar kata
 *   3. Untuk setiap shighot: bangun anatomi → proses i'lal → ambil hasilAkhir
 *   4. Kembalikan objek yang strukturnya identik dengan model Prisma Word
 *
 * Penggunaan:
 *   const wordData = generateSemuaTasrif("صوم", "berpuasa", 1, "صِيَامًا");
 *   await prisma.word.create({ data: wordData });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AnatomiKata, WordContext }           from "./types";
import { deteksiBina }                        from "./bina";
import { bangunAnatomi, renderAnatomiToString, getWazanLabel } from "./wazanBuilder";
import { prosesIlal }                         from "./ilalEngine";

// ══════════════════════════════════════════════════════════════════════════════
//  Tipe Output
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GeneratedWordData — Struktur data output yang siap di-insert ke Prisma.
 * Kolom-kolomnya identik dengan model `Word` di schema.prisma.
 */
export interface GeneratedWordData {
  rootWord:   string;       // Akar kata (ص-و-م)
  indonesian: string;       // Terjemahan Indonesia
  bab:        string;       // "Bab 1" dst
  bina:       string;       // "Ajwaf Wawi" dst
  madhi:      string;       // Fi'il Madhi
  mudhari:    string;       // Fi'il Mudhari'
  masdar:     string;       // Masdar (dari input atau generated)
  masdarMim:  string;       // Masdar Mim (مَفْعَل)
  faail:      string;       // Isim Fa'il (فَاعِل)
  mafuul:     string | null; // Isim Maf'ul (null jika lazim/intransitif)
  amr:        string;       // Fi'il Amr
  nahyi:      string;       // Fi'il Nahyi
  zamanMakan: string;       // Isim Zaman/Makan
  alaat:      string | null; // Isim Alat (null jika bukan fi'il alat)
}

// ══════════════════════════════════════════════════════════════════════════════
//  Helper Internal
// ══════════════════════════════════════════════════════════════════════════════

/**
 * generateSatuShighot — Menjalankan pipeline lengkap untuk satu shighot:
 *   bangunAnatomi → prosesIlal → hasilAkhir sebagai string.
 */
function generateSatuShighot(
  shighot: WordContext["shighot"],
  baseCtx: Omit<WordContext, "shighot">
): string {
  const ctx: WordContext = { ...baseCtx, shighot };

  let anatomiAwal: AnatomiKata;
  try {
    anatomiAwal = bangunAnatomi(ctx);
  } catch (e) {
    // Jika akar kata tidak valid atau shighot tidak dikenali, kembalikan string kosong
    console.warn(`[tasrifGenerator] Gagal bangun anatomi untuk shighot "${shighot}":`, e);
    return "";
  }

  const hasilIlal = prosesIlal(anatomiAwal, ctx);
  return hasilIlal.hasilAkhir;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Fungsi Utama: generateSemuaTasrif
// ══════════════════════════════════════════════════════════════════════════════

/**
 * generateSemuaTasrif — Menghasilkan semua bentuk tasrif untuk satu kata Arab.
 *
 * @param akarKata   - Akar kata 3 huruf Tsulatsi Mujarrad, tanpa harakat (ص-و-م)
 * @param indonesian - Terjemahan bahasa Indonesia
 * @param bab        - Nomor bab (1–6)
 * @param masdarAsli - Masdar yang benar (diisi manual oleh admin, karena masdar
 *                     Arab tidak bisa digenerate 100% otomatis — ada 30+ wazan)
 * @param opsi       - Opsi tambahan (lazim: mafuul null, dsb)
 * @returns GeneratedWordData siap insert ke Prisma
 */
export function generateSemuaTasrif(
  akarKata: string,
  indonesian: string,
  bab: 1 | 2 | 3 | 4 | 5 | 6,
  masdarAsli: string,
  opsi?: {
    /** Set true jika fi'il lazim (tidak punya maf'ul) */
    lazim?: boolean;
    /**
     * Pola wazan Isim Alat yang dipilih admin.
     * - undefined / tidak diisi  : generate dengan wazan default مِفْعَلٌ
     * - "مِفْعَلٌ"             : wazan standar
     * - "مِفْعَالٌ"            : wazan madd (ada Alif antara Ain dan Lam)
     * - "مِفْعَلَةٌ"           : wazan Ta' Marbuthah
     * - "Tidak Ada"               : fi'il tidak mempunyai Isim Alat (alaat = null)
     */
    polaAlat?: "مِفْعَلٌ" | "مِفْعَالٌ" | "مِفْعَلَةٌ" | "Tidak Ada";
  }
): GeneratedWordData {
  // 1. Deteksi bina' dari akar kata
  const bina = deteksiBina(akarKata);

  // 2. Konteks dasar (dipakai ulang untuk semua shighot)
  //    polaAlat dimasukkan agar wazanBuilder bisa memilih wazan Isim Alat yang tepat
  const baseCtx: Omit<WordContext, "shighot"> = {
    akarKata,
    bab,
    bina,
    polaAlat: opsi?.polaAlat, // diteruskan ke buildIsimAlat
  };

  // 3. Generate setiap shighot melalui pipeline anatomi + i'lal
  const madhi      = generateSatuShighot("Fi'il Madhi",       baseCtx);
  const mudhari    = generateSatuShighot("Fi'il Mudhari'",     baseCtx);
  const masdarMim  = generateSatuShighot("Masdar Mim",         baseCtx);
  const faail      = generateSatuShighot("Isim Fa'il",         baseCtx);
  const mafuulStr  = generateSatuShighot("Isim Maf'ul",        baseCtx);
  const amr        = generateSatuShighot("Fi'il Amr",          baseCtx);
  const nahyi      = generateSatuShighot("Fi'il Nahyi",        baseCtx);
  const zamanMakan = generateSatuShighot("Isim Zaman/Makan",   baseCtx);

  // Isim Alat: jika polaAlat = "Tidak Ada", set null langsung
  const alatStr =
    opsi?.polaAlat === "Tidak Ada"
      ? null
      : generateSatuShighot("Isim Alat", baseCtx);

  return {
    rootWord:   akarKata,
    indonesian,
    bab:        `Bab ${bab} (${getWazanLabel(bab)})`,
    bina,
    madhi,
    mudhari,
    masdar:     masdarAsli,
    masdarMim,
    faail,
    mafuul:     opsi?.lazim ? null : mafuulStr,
    amr,
    nahyi,
    zamanMakan,
    alaat:      alatStr,  // null jika polaAlat = "Tidak Ada", string jika ada
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  Preview/Debug Helper
// ══════════════════════════════════════════════════════════════════════════════

/**
 * previewTasrif — Menampilkan seluruh tasrif ke konsol.
 * Berguna saat development / seeding manual.
 */
export function previewTasrif(data: GeneratedWordData): void {
  console.log("═══════════════════════════════════════");
  console.log(`  Kata    : ${data.rootWord}  (${data.indonesian})`);
  console.log(`  Bab     : ${data.bab}`);
  console.log(`  Bina'   : ${data.bina}`);
  console.log("───────────────────────────────────────");
  console.log(`  Madhi      : ${data.madhi}`);
  console.log(`  Mudhari'   : ${data.mudhari}`);
  console.log(`  Masdar     : ${data.masdar}`);
  console.log(`  Masdar Mim : ${data.masdarMim}`);
  console.log(`  Fa'il      : ${data.faail}`);
  console.log(`  Maf'ul     : ${data.mafuul ?? "—"}`);
  console.log(`  Amr        : ${data.amr}`);
  console.log(`  Nahyi      : ${data.nahyi}`);
  console.log(`  Zaman/Makan: ${data.zamanMakan}`);
  console.log(`  Alaat      : ${data.alaat ?? "—"}`);
  console.log("═══════════════════════════════════════");
}
