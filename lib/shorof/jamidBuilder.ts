/**
 * lib/shorof/jamidBuilder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Isim Jamid: kata benda yang bukan turunan (tidak punya akar fi'il).
 * Contoh: قَلَمٌ (pena), بَيْتٌ (rumah), رَجُلٌ (laki-laki).
 *
 * Cakupan Fase 2:
 *   - Mufrad → Mutsanna → Jamak Salim (mudzakkar & muannats)
 *   - I'rab: Rafa' / Nashab / Jarr untuk tiap bentuk
 *
 * Bukan cakupan (nanti): jamak taksir (masuk Fase 4, sima'i).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════════════════
// Tipe Data
// ══════════════════════════════════════════════════════════════════════════════

export type JenisIsim = "mudzakkar" | "muannats";
export type BentukIsim = "mufrad" | "mutsanna" | "jamak";
export type Irab = "rafa" | "nashab" | "jarr";

export interface IsimJamid {
  /** Kata dasar tanpa tanwin, misal: قَلَم */
  kata: string;
  /** Arti bahasa Indonesia */
  arti: string;
  /** Jenis: mudzakkar / muannats */
  jenis: JenisIsim;
  /** Apakah berakhiran ta' marbuthah (ة) — untuk muannats */
  adaTaMarbuthah?: boolean;
}

export interface HasilIsim {
  bentuk: BentukIsim;
  irab: Irab;
  lafadz: string;
  label: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Konstanta
// ══════════════════════════════════════════════════════════════════════════════

const H = {
  FATHAH: "\u064E",
  DHAMMAH: "\u064F",
  KASRAH: "\u0650",
  SUKUN: "\u0652",
  TANWIN_DHAMMAH: "\u064C", // ٌ
  TANWIN_FATHAH: "\u064B",  // ً
  TANWIN_KASRAH: "\u064D",  // ٍ
  ALIF: "\u0627",
  WAWU: "\u0648",
  YA: "\u064A",
  NUN: "\u0646",
  TA_MARBUTHAH: "\u0629",
  TA_MAFTUHAH: "\u062A",
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// Helper
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Hapus tanwin/harakat akhir dari kata dasar.
 * Contoh: قَلَمٌ → قَلَم
 */
function bersihkanAkhir(kata: string): string {
  return kata.replace(/[ً-ٰٟ]$/g, "");
}

/**
 * Untuk jamak muannats: hapus ta' marbuthah, nanti ditambah ات.
 * Contoh: مَدْرَسَة → مَدْرَسَ → مَدْرَسَات
 */
function hapusTaMarbuthah(kata: string): string {
  if (kata.endsWith(H.TA_MARBUTHAH)) {
    return kata.slice(0, -1);
  }
  return kata;
}

// ══════════════════════════════════════════════════════════════════════════════
// Builder Utama
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate satu bentuk isim jamid dengan i'rab tertentu.
 */
export function bangunIsimJamid(
  isim: IsimJamid,
  bentuk: BentukIsim,
  irab: Irab
): string {
  const dasar = bersihkanAkhir(isim.kata);

  // ── MUFRAD ──────────────────────────────────────────────
  if (bentuk === "mufrad") {
    // Nashab: tambah alif setelah tanwin (kecuali ta' marbuthah & alif)
    // Contoh: قَلَمًا, tapi مَدْرَسَةً (tanpa alif)
    const akhirAlif = dasar.endsWith(H.ALIF);
    const akhirTaMarbuthah = dasar.endsWith(H.TA_MARBUTHAH);

    if (irab === "rafa") return dasar + H.TANWIN_DHAMMAH;
    if (irab === "jarr") return dasar + H.TANWIN_KASRAH;
    // nashab
    if (akhirAlif || akhirTaMarbuthah) {
      return dasar + H.TANWIN_FATHAH;
    }
    return dasar + H.ALIF + H.TANWIN_FATHAH;
  }

  // ── MUTSANNĀ ────────────────────────────────────────────
  if (bentuk === "mutsanna") {
    if (irab === "rafa") {
      // قَلَمَانِ
      return dasar + H.ALIF + H.NUN + H.KASRAH;
    } else {
      // قَلَمَيْنِ (nashab & jarr sama)
      return dasar + H.YA + H.SUKUN + H.NUN + H.KASRAH;
    }
  }

  // ── JAMAK ───────────────────────────────────────────────
  if (isim.jenis === "mudzakkar") {
    // Jamak Mudzakkar Salim
    if (irab === "rafa") {
      // مُسْلِمُونَ
      return dasar + H.WAWU + H.NUN + H.FATHAH;
    } else {
      // مُسْلِمِينَ (nashab & jarr sama)
      return dasar + H.YA + H.NUN + H.KASRAH;
    }
  } else {
    // Jamak Muannats Salim
    const dasarBersih = hapusTaMarbuthah(dasar);
    if (irab === "rafa") {
      // مُسْلِمَاتٌ
      return dasarBersih + H.ALIF + H.TA_MAFTUHAH + H.TANWIN_DHAMMAH;
    } else if (irab === "nashab") {
      // مُسْلِمَاتٍ (nashab dengan kasrah — khusus jamak muannats!)
      return dasarBersih + H.ALIF + H.TA_MAFTUHAH + H.TANWIN_KASRAH;
    } else {
      // مُسْلِمَاتٍ (jarr)
      return dasarBersih + H.ALIF + H.TA_MAFTUHAH + H.TANWIN_KASRAH;
    }
  }
}

/**
 * Generate semua bentuk (3 bentuk × 3 i'rab = 9) untuk satu isim.
 */
export function generateSemuaBentuk(isim: IsimJamid): HasilIsim[] {
  const hasil: HasilIsim[] = [];
  const bentuks: BentukIsim[] = ["mufrad", "mutsanna", "jamak"];
  const irabs: Irab[] = ["rafa", "nashab", "jarr"];

  const labelBentuk = { mufrad: "مُفْرَد", mutsanna: "مُثَنَّى", jamak: "جَمْع" };
  const labelIrab = { rafa: "رَفْع", nashab: "نَصْب", jarr: "جَرّ" };

  for (const bentuk of bentuks) {
    for (const irab of irabs) {
      hasil.push({
        bentuk,
        irab,
        lafadz: bangunIsimJamid(isim, bentuk, irab),
        label: `${labelBentuk[bentuk]} ${labelIrab[irab]}`,
      });
    }
  }
  return hasil;
}

// ══════════════════════════════════════════════════════════════════════════════
// Data Awal (100 kata umum — tahap awal)
// ══════════════════════════════════════════════════════════════════════════════

export const ISIM_JAMID_AWAL: IsimJamid[] = [
  { kata: "قَلَم", arti: "pena", jenis: "mudzakkar" },
  { kata: "بَيْت", arti: "rumah", jenis: "mudzakkar" },
  { kata: "رَجُل", arti: "laki-laki", jenis: "mudzakkar" },
  { kata: "مَسْجِد", arti: "masjid", jenis: "mudzakkar" },
  { kata: "كِتَاب", arti: "buku", jenis: "mudzakkar" },
  { kata: "مَدْرَسَة", arti: "sekolah", jenis: "muannats", adaTaMarbuthah: true },
  { kata: "اِمْرَأَة", arti: "perempuan", jenis: "muannats", adaTaMarbuthah: true },
  { kata: "شَمْس", arti: "matahari", jenis: "muannats" },
  { kata: "أَرْض", arti: "bumi", jenis: "muannats" },
  { kata: "مُسْلِم", arti: "muslim", jenis: "mudzakkar" },
  // ... (90 lagi bisa ditambah bertahap)
];
