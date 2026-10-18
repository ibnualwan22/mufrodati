/**
 * lib/shorof/lughawiBuilder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tasrif Lughawi: konjugasi fi'il per dhamir (kata ganti).
 *
 * Cakupan:
 *   - Fi'il Madhi  : 14 dhamir
 *   - Fi'il Mudhari': 14 dhamir
 *   - Fi'il Amr     : 6 dhamir mukhatab
 *   - Fi'il Nahyi   : 6 dhamir mukhatab
 *
 * Prinsip: bangun 14 variasi anatomi → lempar ke pipeline i'lal yang sama.
 * Flag `muttashil` menandai dhamir yang menempel langsung (تُ، تَ، نَ...)
 * → memicu kaidah khusus (fakkul idghom, naql+hadzf ajwaf).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AnatomiKata, WordContext } from "./types";

// ══════════════════════════════════════════════════════════════════════════════
// Konstanta Harakat & Huruf
// ══════════════════════════════════════════════════════════════════════════════

const H = {
  FATHAH: "\u064E",
  DHAMMAH: "\u064F",
  KASRAH: "\u0650",
  SUKUN: "\u0652",
  TASYDID: "\u0651",
  ALIF: "\u0627",
  WAWU: "\u0648",
  YA: "\u064A",
  TA: "\u062A",
  NUN: "\u0646",
  MIM: "\u0645",
  HAMZAH_WASHAL: "\u0627",
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// Tabel Dhamir
// ══════════════════════════════════════════════════════════════════════════════

export interface DhamirInfo {
  id: string;
  label: string;
  /** Suffix untuk madhi (ditempel setelah lam fi'il) */
  suffixMadhi: string;
  /** Harakat suffix madhi */
  harakatSuffixMadhi: string;
  /** Prefix mudhari' (huruf mudhara'ah + harakatnya digabung) */
  prefixMudhari: string;
  /** Suffix untuk mudhari' */
  suffixMudhari: string;
  /** true jika dhamir menempel langsung → picu i'lal khusus */
  muttashil: boolean;
  /** Untuk amr/nahyi: bentuk dasar amr */
  isMukhatab: boolean;
}

/**
 * 14 Dhamir untuk Fi'il Madhi & Mudhari'
 * Urutan standar kitab shorof.
 */
export const DHAMIR_14: DhamirInfo[] = [
  // Ghaib (orang ketiga)
  { id: "huwa",    label: "هُوَ",    suffixMadhi: "",   harakatSuffixMadhi: "",        prefixMudhari: "يَ", suffixMudhari: "",    muttashil: false, isMukhatab: false },
  { id: "huma_m",  label: "هُمَا",   suffixMadhi: "ا",  harakatSuffixMadhi: H.FATHAH,  prefixMudhari: "يَ", suffixMudhari: "انِ", muttashil: false, isMukhatab: false },
  { id: "hum",     label: "هُمْ",    suffixMadhi: "وا", harakatSuffixMadhi: H.FATHAH,  prefixMudhari: "يَ", suffixMudhari: "ونَ", muttashil: false, isMukhatab: false },
  { id: "hiya",    label: "هِيَ",    suffixMadhi: "تْ", harakatSuffixMadhi: H.SUKUN,   prefixMudhari: "تَ", suffixMudhari: "",    muttashil: false, isMukhatab: false },
  { id: "huma_f",  label: "هُمَا",   suffixMadhi: "تَا", harakatSuffixMadhi: H.FATHAH, prefixMudhari: "تَ", suffixMudhari: "انِ", muttashil: false, isMukhatab: false },
  { id: "hunna",   label: "هُنَّ",   suffixMadhi: "نَ", harakatSuffixMadhi: H.FATHAH,  prefixMudhari: "يَ", suffixMudhari: "نَ",  muttashil: true,  isMukhatab: false },
  // Mukhatab (orang kedua)
  { id: "anta",    label: "أَنْتَ",  suffixMadhi: "تَ", harakatSuffixMadhi: H.FATHAH,  prefixMudhari: "تَ", suffixMudhari: "",    muttashil: true,  isMukhatab: true },
  { id: "antuma",  label: "أَنْتُمَا", suffixMadhi: "تُمَا", harakatSuffixMadhi: H.FATHAH, prefixMudhari: "تَ", suffixMudhari: "انِ", muttashil: true, isMukhatab: true },
  { id: "antum",   label: "أَنْتُمْ", suffixMadhi: "تُمْ", harakatSuffixMadhi: H.DHAMMAH, prefixMudhari: "تَ", suffixMudhari: "ونَ", muttashil: true, isMukhatab: true },
  { id: "anti",    label: "أَنْتِ",  suffixMadhi: "تِ", harakatSuffixMadhi: H.KASRAH,  prefixMudhari: "تَ", suffixMudhari: "ينَ", muttashil: true,  isMukhatab: true },
  { id: "antunna", label: "أَنْتُنَّ", suffixMadhi: "تُنَّ", harakatSuffixMadhi: H.FATHAH, prefixMudhari: "تَ", suffixMudhari: "نَ", muttashil: true, isMukhatab: true },
  // Mutakallim (orang pertama)
  { id: "ana",     label: "أَنَا",   suffixMadhi: "تُ", harakatSuffixMadhi: H.DHAMMAH, prefixMudhari: "أَ", suffixMudhari: "",    muttashil: true,  isMukhatab: false },
  { id: "nahnu",   label: "نَحْنُ",  suffixMadhi: "نَا", harakatSuffixMadhi: H.FATHAH, prefixMudhari: "نَ", suffixMudhari: "",    muttashil: true,  isMukhatab: false },
];

/** 6 Dhamir mukhatab untuk Amr/Nahyi */
export const DHAMIR_AMR_6: DhamirInfo[] = DHAMIR_14.filter(d => d.isMukhatab);

// ══════════════════════════════════════════════════════════════════════════════
// Harakat per Bab (untuk madhi & mudhari')
// ══════════════════════════════════════════════════════════════════════════════

const BAB_HARAKAT: Record<number, { ainMadhi: string; ainMudhari: string }> = {
  1: { ainMadhi: H.FATHAH,  ainMudhari: H.DHAMMAH }, // فَعَلَ - يَفْعُلُ
  2: { ainMadhi: H.FATHAH,  ainMudhari: H.KASRAH  }, // فَعَلَ - يَفْعِلُ
  3: { ainMadhi: H.FATHAH,  ainMudhari: H.FATHAH  }, // فَعَلَ - يَفْعَلُ
  4: { ainMadhi: H.KASRAH,  ainMudhari: H.FATHAH  }, // فَعِلَ - يَفْعَلُ
  5: { ainMadhi: H.DHAMMAH, ainMudhari: H.DHAMMAH }, // فَعُلَ - يَفْعُلُ
  6: { ainMadhi: H.KASRAH,  ainMudhari: H.KASRAH  }, // فَعِلَ - يَفْعِلُ
};

// ══════════════════════════════════════════════════════════════════════════════
// Builder Utama
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Bangun anatomi untuk satu kombinasi (shighot + dhamir).
 * Untuk Tahap 1.1: hanya shahih salim, tsulatsi mujarrad.
 */
export function bangunAnatomiLughawi(
  fa: string,
  ain: string,
  lam: string,
  bab: 1 | 2 | 3 | 4 | 5 | 6,
  shighot: "madhi" | "mudhari" | "amr",
  dhamir: DhamirInfo,
  bina?: string
): AnatomiKata {
  const hk = BAB_HARAKAT[bab];

  if (shighot === "madhi") {
    return buildMadhiLughawi(fa, ain, lam, hk.ainMadhi, dhamir, bina);
  }
  if (shighot === "mudhari") {
    return buildMudhariLughawi(fa, ain, lam, hk.ainMudhari, dhamir);
  }
  // amr
  return buildAmrLughawi(fa, ain, lam, hk.ainMudhari, dhamir, bab);
}

// ── Fi'il Madhi + Dhamir ──────────────────────────────────────────────

function buildMadhiLughawi(
  fa: string, ain: string, lam: string,
  harakatAin: string,
  dhamir: DhamirInfo,
  bina?: string
): AnatomiKata {
  // Base: فَعَلَ (fa fathah, ain sesuai bab, lam fathah)
  // Untuk dhamir muttashil, lam fi'il disukunkan sebelum suffix
  // Contoh: كَتَبَ + تُ → كَتَبْتُ (lam disukun)
  const lamSukun = dhamir.muttashil || dhamir.suffixMadhi !== "";

  // KHUSUS NAQISH/LAFIF + hum: suffix "وا" → "ا" (wawu lam sudah ada)
  // Contoh: دَعَوَ + وا → دَعَوْا (bukan دَعَوْوَا)
  let suffix = dhamir.suffixMadhi;
  let harakatSuffix = dhamir.harakatSuffixMadhi;
  const isNaqishLafif = bina && (bina.startsWith("Naqish") || bina.startsWith("Lafif"));
  if (isNaqishLafif && dhamir.id === "hum" && (lam === "و" || lam === "ي")) {
    suffix = "ا"; // hanya alif, wawu/ya sudah dari lam fi'il
  }

  // KHUSUS NAQISH + hiya: lam JANGAN disukun, biarkan berharakat
  // agar kaidah3 (wawu→alif) bisa trigger, lalu kaidahNaqishHiya hazf alif
  // Contoh: دَعَوَ + تْ → دَعَا + تْ → دَعَتْ
  let harakatLamFinal: string;
  if (isNaqishLafif && dhamir.id === "hiya") {
    harakatLamFinal = H.FATHAH; // biarkan hidup untuk kaidah3
  } else {
    harakatLamFinal = lamSukun ? H.SUKUN : H.FATHAH;
  }

  return {
    faFiil: fa,
    harakatFa: H.FATHAH,
    ainFiil: ain,
    harakatAin: harakatAin,
    lamFiil: lam,
    harakatLam: harakatLamFinal,
    hurufZiyadahAkhir: suffix
      ? suffix + harakatSuffix
      : undefined,
  };
}

// ── Fi'il Mudhari' + Dhamir ───────────────────────────────────────────

function buildMudhariLughawi(
  fa: string, ain: string, lam: string,
  harakatAin: string,
  dhamir: DhamirInfo
): AnatomiKata {
  // Base: يَفْعُلُ (prefix ya fathah, fa sukun, ain sesuai bab, lam dhammah)
  // Untuk suffix (ان، ون، ين، ن), lam fi'il disukunkan
  // Contoh: يَكْتُبُ + ونَ → يَكْتُبُونَ (lam disukun)
  const adaSuffix = dhamir.suffixMudhari !== "";

  // Parse prefix: "يَ" → huruf=ي, harakat=fathah
  const prefixHuruf = dhamir.prefixMudhari[0];
  const prefixHarakat = dhamir.prefixMudhari[1] || H.FATHAH;

  return {
    hurufMudhoroah: prefixHuruf,
    harakatMudhoroah: prefixHarakat,
    faFiil: fa,
    harakatFa: H.SUKUN,
    ainFiil: ain,
    harakatAin: harakatAin,
    lamFiil: lam,
    harakatLam: adaSuffix ? H.SUKUN : H.DHAMMAH,
    hurufZiyadahAkhir: dhamir.suffixMudhari || undefined,
  };
}

// ── Fi'il Amr + Dhamir (6 mukhatab) ───────────────────────────────────

function buildAmrLughawi(
  fa: string, ain: string, lam: string,
  harakatAinMudhari: string,
  dhamir: DhamirInfo,
  bab: number
): AnatomiKata {
  // Kaidah amr:
  // - Jika mudhari' berharakat dhammah (bab 1,5): hamzah washal dhammah (اُ)
  // - Selainnya: hamzah washal kasrah (اِ)
  // - Lam fi'il disukunkan
  // - Suffix: ا (antuma), وا (antum), ي (anti), نَ (antunna)

  const hamzahHarakat =
    harakatAinMudhari === H.DHAMMAH ? H.DHAMMAH : H.KASRAH;

  // Suffix amr berdasarkan dhamir
  let suffix = "";
  if (dhamir.id === "antuma") suffix = "ا";
  else if (dhamir.id === "antum") suffix = "وا";
  else if (dhamir.id === "anti") suffix = "ي";
  else if (dhamir.id === "antunna") suffix = "نَ";
  // anta: tanpa suffix

  return {
    hurufZiyadahAwal: H.HAMZAH_WASHAL + hamzahHarakat,
    faFiil: fa,
    harakatFa: H.SUKUN,
    ainFiil: ain,
    harakatAin: harakatAinMudhari,
    lamFiil: lam,
    harakatLam: suffix ? H.SUKUN : H.SUKUN,
    hurufZiyadahAkhir: suffix || undefined,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Fungsi Generate Lengkap
// ══════════════════════════════════════════════════════════════════════════════

export interface HasilLughawi {
  dhamir: string;
  label: string;
  anatomi: AnatomiKata;
  muttashil: boolean;
}

/**
 * Generate semua bentuk lughawi untuk satu shighot.
 * Mengembalikan anatomi (belum melalui i'lal) — i'lal diterapkan oleh pemanggil.
 */
export function generateLughawi(
  fa: string,
  ain: string,
  lam: string,
  bab: 1 | 2 | 3 | 4 | 5 | 6,
  shighot: "madhi" | "mudhari" | "amr",
  bina?: string
): HasilLughawi[] {
  const daftarDhamir = shighot === "amr" ? DHAMIR_AMR_6 : DHAMIR_14;

  return daftarDhamir.map(dhamir => ({
    dhamir: dhamir.id,
    label: dhamir.label,
    anatomi: bangunAnatomiLughawi(fa, ain, lam, bab, shighot, dhamir, bina),
    muttashil: dhamir.muttashil,
  }));
}
