import { AnatomiKata } from "./types";

const H = {
  FATHAH: "\u064E",
  DHAMMAH: "\u064F",
  KASRAH: "\u0650",
  SUKUN: "\u0652",
  TASYDID: "\u0651",
  TANWIN_DHAMMAH: "\u064C",
  TANWIN_FATHAH: "\u064B",
  TANWIN_KASRAH: "\u064D",

  YA_MUDH: "\u064A",
  TA_MUDH: "\u062A",
  ALIF: "\u0627",
  MIM: "\u0645",
  TA_MARBUTHAH: "\u0629",
  HAMZAH_BAWAH: "\u0625",
  TA: "\u062A",
  NUN: "\u0646",
} as const;

function normalizeBabRubai(bab: string): string {
  if (bab === "fa'lala" || bab === "tafa'lala" || bab === "if'anlala" || bab === "if'alalla") {
    return bab;
  }
  return bab; 
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. WAZAN FA'LALA (فَعْلَلَ) - RUBA'I MUJARROD
// ─────────────────────────────────────────────────────────────────────────────
function buildFaLala(fa: string, ain: string, lam1: string, lam2: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi":
      return { faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'": // يُفَعْلِلُ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.DHAMMAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.DHAMMAH };
    case "Masdar": // فَعْلَلَةً / فِعْلَالًا
      return [
        { // فَعْلَلَةً
          faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.FATHAH, hurufZiyadahAkhir: H.TA_MARBUTHAH + H.TANWIN_FATHAH
        },
        { // فِعْلَالًا
          faFiil: fa, harakatFa: H.KASRAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH + H.ALIF, lamFiil: lam2, harakatLam: H.TANWIN_FATHAH
        }
      ];
    case "Isim Fa'il": // مُفَعْلِلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُفَعْلَلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // فَعْلِلْ
      return { faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.SUKUN };
    case "Fi'il Nahyi": // لَا تُفَعْلِلْ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.DHAMMAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WAZAN TAFA'LALA (تَفَعْلَلَ) - RUBA'I MAZID (KHUMASI)
// ─────────────────────────────────────────────────────────────────────────────
function buildTafaLala(fa: string, ain: string, lam1: string, lam2: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'": // يَتَفَعْلَلُ
      return { hurufZiyadahAwal: H.TA + H.FATHAH, hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.DHAMMAH };
    case "Masdar": // تَفَعْلُلًا
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.DHAMMAH, lamFiil: lam2, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُتَفَعْلِلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُتَفَعْلَلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // تَفَعْلَلْ
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.SUKUN };
    case "Fi'il Nahyi": // لَا تَتَفَعْلَلْ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH + H.FATHAH + H.TA, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WAZAN IF'ANLALA (اِفْعَنْلَلَ) - RUBA'I MAZID (SUDASI)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfanlala(fa: string, ain: string, lam1: string, lam2: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi": // اِفْعَنْلَلَ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'": // يَفْعَنْلِلُ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.DHAMMAH };
    case "Masdar": // اِفْعِنْلَالًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH + H.ALIF, lamFiil: lam2, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُفْعَنْلِلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُفْعَنْلَلٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِفْعَنْلِلْ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.SUKUN };
    case "Fi'il Nahyi": // لَا تَفْعَنْلِلْ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH + H.NUN + H.SUKUN, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WAZAN IF'ALALLA (اِفْعَلَلَّ) - RUBA'I MAZID (SUDASI)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfalalla(fa: string, ain: string, lam1: string, lam2: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi": // اِفْعَلَلَّ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Mudhari'": // يَفْعَلِلُّ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TASYDID + H.DHAMMAH };
    case "Masdar": // اِفْعِلَّالًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiilKedua: lam1, harakatLamKedua: H.TASYDID + H.FATHAH + H.ALIF, lamFiil: lam2, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُفْعَلِلٌّ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُفْعَلَلٌّ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.FATHAH, lamFiil: lam2, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِفْعَلِلْ (diidghomkan saat waqaf dll, asalnya اِفْعَلِلْلْ -> اِفْعَلِلَّ)
      // Untuk amr yang diidghomkan, biasanya berharakat fathah setelah tasydid (اِفْعَلِلَّ) atau bisa pecah (اِفْعَلْلِلْ)
      // Kita kembalikan versi fathah sebagai bentuk idghom dominan.
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Nahyi": // لَا تَفْعَلِلَّ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiilKedua: lam1, harakatLamKedua: H.KASRAH, lamFiil: lam2, harakatLam: H.TASYDID + H.FATHAH };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHER UTAMA RUBA'I
// ─────────────────────────────────────────────────────────────────────────────

export function bangunAnatomiRubai(
  fa: string, 
  ain: string, 
  lam1: string, 
  lam2: string,
  babStringId: string, 
  shighot: string
): AnatomiKata | AnatomiKata[] {
  
  const wazan = normalizeBabRubai(babStringId);

  switch (wazan) {
    case "fa'lala":
      return buildFaLala(fa, ain, lam1, lam2, shighot);
    case "tafa'lala":
      return buildTafaLala(fa, ain, lam1, lam2, shighot);
    case "if'anlala":
      return buildIfanlala(fa, ain, lam1, lam2, shighot);
    case "if'alalla":
      return buildIfalalla(fa, ain, lam1, lam2, shighot);
      
    default:
      throw new Error(`Wazan Ruba'i dengan ID '${babStringId}' (Wazan: ${wazan}) tidak dikenali.`);
  }
}
