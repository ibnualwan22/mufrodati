/**
 * lib/shorof/sifatMusyabbahah.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sifat Musyabbahah: sifat yang menyerupai isim fa'il (menunjukkan sifat tetap).
 *
 * Wazan:
 *   1. فَعِيل      → كَرِيم (muannats: كَرِيمَة)
 *   2. أَفْعَل     → أَحْمَر (muannats: حَمْرَاء — untuk warna/cacat)
 *   3. فَعْلَان    → عَطْشَان (muannats: عَطْشَى)
 *   4. فَعِل      → فَرِح (muannats: فَرِحَة)
 *   5. فَعُول     → صَبُور (muannats: صَبُورَة)
 *
 * Sifat musyabbahah biasanya dari fi'il lazim (intransitif),
 * terutama Bab 4 (فَعِلَ) dan Bab 5 (فَعُلَ).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const H = {
  FATHAH: "\u064E",
  DHAMMAH: "\u064F",
  KASRAH: "\u0650",
  SUKUN: "\u0652",
  ALIF: "\u0627",
  WAWU: "\u0648",
  YA: "\u064A",
  HAMZAH_ATAS: "\u0623",
  TA_MARBUTHAH: "\u0629",
  ALIF_MAQSURAH: "\u0649",
  TANWIN_DHAMMAH: "\u064C",
  NUN: "\u0646",
} as const;

export type WazanSifat =
  | "fa'il"      // فَعِيل
  | "af'al"      // أَفْعَل (warna/cacat)
  | "fa'lan"     // فَعْلَان
  | "fa'il2"     // فَعِل
  | "fa'ul";     // فَعُول

export interface SifatMusyabbahah {
  wazan: WazanSifat;
  mudzakkar: string;
  muannats: string;
  arti: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Builder per Wazan
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 1. فَعِيل — misal: كَرِيم dari ك-ر-م
 * Muannats: tambah ta' marbuthah → كَرِيمَة
 */
function buildFaIil(fa: string, ain: string, lam: string): { mudzakkar: string; muannats: string } {
  // فَعِيلٌ
  const mudzakkar =
    fa + H.FATHAH +
    ain + H.KASRAH +
    H.YA +
    lam + H.TANWIN_DHAMMAH;
  // فَعِيلَةٌ
  const muannats =
    fa + H.FATHAH +
    ain + H.KASRAH +
    H.YA +
    lam + H.FATHAH +
    H.TA_MARBUTHAH + H.TANWIN_DHAMMAH;
  return { mudzakkar, muannats };
}

/**
 * 2. أَفْعَل — untuk warna & cacat fisik, misal: أَحْمَر dari ح-م-ر
 * Muannats: فَعْلَاء → حَمْرَاء
 */
function buildAfAl(fa: string, ain: string, lam: string): { mudzakkar: string; muannats: string } {
  // أَفْعَلُ
  const mudzakkar =
    H.HAMZAH_ATAS + H.FATHAH +
    fa + H.SUKUN +
    ain + H.FATHAH +
    lam + H.DHAMMAH;
  // فَعْلَاءُ (hamzah di atas garis ء, bukan di atas alif)
  const muannats =
    fa + H.FATHAH +
    ain + H.SUKUN +
    lam + H.FATHAH +
    H.ALIF +
    "\u0621" + H.DHAMMAH; // ءُ
  return { mudzakkar, muannats };
}

/**
 * 3. فَعْلَان — misal: عَطْشَان dari ع-ط-ش
 * Muannats: فَعْلَى → عَطْشَى
 */
function buildFaLan(fa: string, ain: string, lam: string): { mudzakkar: string; muannats: string } {
  // فَعْلَانُ
  const mudzakkar =
    fa + H.FATHAH +
    ain + H.SUKUN +
    lam + H.FATHAH +
    H.ALIF +
    H.NUN + H.TANWIN_DHAMMAH;
  // فَعْلَى
  const muannats =
    fa + H.FATHAH +
    ain + H.SUKUN +
    lam + H.FATHAH +
    H.ALIF_MAQSURAH;
  return { mudzakkar, muannats };
}

/**
 * 4. فَعِل — misal: فَرِح dari ف-ر-ح
 * Muannats: فَرِحَة
 */
function buildFaIl(fa: string, ain: string, lam: string): { mudzakkar: string; muannats: string } {
  // فَعِلٌ
  const mudzakkar =
    fa + H.FATHAH +
    ain + H.KASRAH +
    lam + H.TANWIN_DHAMMAH;
  // فَعِلَةٌ
  const muannats =
    fa + H.FATHAH +
    ain + H.KASRAH +
    lam + H.FATHAH +
    H.TA_MARBUTHAH + H.TANWIN_DHAMMAH;
  return { mudzakkar, muannats };
}

/**
 * 5. فَعُول — misal: صَبُور dari ص-ب-ر
 * Muannats: صَبُورَة
 */
function buildFaUl(fa: string, ain: string, lam: string): { mudzakkar: string; muannats: string } {
  // فَعُولٌ
  const mudzakkar =
    fa + H.FATHAH +
    ain + H.DHAMMAH +
    H.WAWU +
    lam + H.TANWIN_DHAMMAH;
  // فَعُولَةٌ
  const muannats =
    fa + H.FATHAH +
    ain + H.DHAMMAH +
    H.WAWU +
    lam + H.FATHAH +
    H.TA_MARBUTHAH + H.TANWIN_DHAMMAH;
  return { mudzakkar, muannats };
}

// ══════════════════════════════════════════════════════════════════════════════
// Fungsi Utama
// ══════════════════════════════════════════════════════════════════════════════

const BUILDERS: Record<WazanSifat, typeof buildFaIil> = {
  "fa'il": buildFaIil,
  "af'al": buildAfAl,
  "fa'lan": buildFaLan,
  "fa'il2": buildFaIl,
  "fa'ul": buildFaUl,
};

export const WAZAN_LABEL: Record<WazanSifat, string> = {
  "fa'il": "فَعِيل",
  "af'al": "أَفْعَل",
  "fa'lan": "فَعْلَان",
  "fa'il2": "فَعِل",
  "fa'ul": "فَعُول",
};

/**
 * Generate sifat musyabbahah untuk satu wazan.
 */
export function bangunSifatMusyabbahah(
  fa: string,
  ain: string,
  lam: string,
  wazan: WazanSifat,
  arti: string = ""
): SifatMusyabbahah {
  const builder = BUILDERS[wazan];
  const { mudzakkar, muannats } = builder(fa, ain, lam);
  return { wazan, mudzakkar, muannats, arti };
}

/**
 * Generate semua 5 wazan untuk satu akar kata.
 */
export function generateSemuaSifat(
  fa: string,
  ain: string,
  lam: string,
  artiDasar: string = ""
): SifatMusyabbahah[] {
  const wazans: WazanSifat[] = ["fa'il", "af'al", "fa'lan", "fa'il2", "fa'ul"];
  return wazans.map(w => bangunSifatMusyabbahah(fa, ain, lam, w, artiDasar));
}
