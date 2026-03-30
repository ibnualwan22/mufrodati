import { AnatomiKata, WordContext } from "./types";

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
  WAWU: "\u0648",
  YA: "\u064A",
  MIM: "\u0645",
  TA_MARBUTHAH: "\u0629",
  HAMZAH_ATAS: "\u0623",
  HAMZAH_BAWAH: "\u0625",
  TA: "\u062A",
  NUN: "\u0646",
  SIN: "\u0633",
  LAM_ALIF: "\u0644\u0627"
} as const;

/**
 * Normalisasi Bab ID ke Wazan Standar.
 * Menerima ID dari Qutrub (seperti "112", "126") atau string wazan eksplisit.
 */
function normalizeBabMazid(bab: string): string {
  // Map ID Qutrub ke Wazan Standar
  const qutrubMap: Record<string, string> = {
    // Rubai
    "53": "af'ala",  // Biasanya Mahmuz Fa'
    "56": "af'ala",
    "61": "af'ala",
    "112": "fa''ala", // فَـعَّـلَ
    "126": "tafa''ala", // تَـفَـعَّـلَ
    "115": "ifta'ala", // افْتَعَلَ
    "130": "istaf'ala", // اسْتَفْعَلَ
    "73": "infa'ala", // انْفَعَلَ
    // Tambahkan lebih banyak jika teridentifikasi saat import
  };

  if (qutrubMap[bab]) return qutrubMap[bab];

  const wazanValid = [
    "af'ala", "fa''ala", "faa'ala", "tafa''ala", "tafaa'ala", 
    "ifta'ala", "infa'ala", "istaf'ala", "if'alla", "if'aalla", 
    "if'aw'ala", "if'awwala"
  ];
  if (wazanValid.includes(bab)) return bab;

  return bab; 
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. WAZAN AF'ALA (أَفْعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildAfala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi":
      return {
        hurufZiyadahAwal: H.HAMZAH_ATAS + H.FATHAH, // أَ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.FATHAH,
        lamFiil: lam, harakatLam: H.FATHAH
      };
    case "Fi'il Mudhari'":
      return {
        hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.DHAMMAH, // يُ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.KASRAH, // ـعِـ
        lamFiil: lam, harakatLam: H.DHAMMAH
      };
    case "Masdar":
      return {
        hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, // إِ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.FATHAH,
        hurufZiyadahSetelahAin: H.ALIF, // ا
        lamFiil: lam, harakatLam: H.TANWIN_FATHAH // ـلًا
      };
    case "Isim Fa'il":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH, // مُ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH, // مُ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.FATHAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Fi'il Amr":
      return {
        hurufZiyadahAwal: H.HAMZAH_ATAS + H.FATHAH, // أَ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    case "Fi'il Nahyi":
      return {
        hurufZiyadahAwal: "\u0644\u064e\u0627", // لَا (tanpa spasi di sini, tambahkan spasi dan ta' di mudhoroah)
        hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.DHAMMAH, // تُ
        faFiil: fa, harakatFa: H.SUKUN,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    default:
      return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WAZAN FA''ALA (فَعَّلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildFa33ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi":
      return {
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, // ـعَّـ
        lamFiil: lam, harakatLam: H.FATHAH
      };
    case "Fi'il Mudhari'":
      return {
        hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.DHAMMAH, // يُ
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.KASRAH, // ـعِّـ
        lamFiil: lam, harakatLam: H.DHAMMAH
      };
    case "Masdar":
      return [
        { // تَفْعِيلًا
          hurufZiyadahAwal: H.TA + H.FATHAH, // تَ
          faFiil: fa, harakatFa: H.SUKUN,
          ainFiil: ain, harakatAin: H.KASRAH,
          hurufZiyadahSetelahAin: H.YA + H.SUKUN, // يْ
          lamFiil: lam, harakatLam: H.TANWIN_FATHAH
        },
        { // تَفْعِلَةً
          hurufZiyadahAwal: H.TA + H.FATHAH,
          faFiil: fa, harakatFa: H.SUKUN,
          ainFiil: ain, harakatAin: H.KASRAH,
          lamFiil: lam, harakatLam: H.FATHAH,
          hurufZiyadahAkhir: H.TA_MARBUTHAH + H.TANWIN_FATHAH // َةً
        },
        { // تَفْعَالًا
          hurufZiyadahAwal: H.TA + H.FATHAH,
          faFiil: fa, harakatFa: H.SUKUN,
          ainFiil: ain, harakatAin: H.FATHAH,
          hurufZiyadahSetelahAin: H.ALIF, // ا
          lamFiil: lam, harakatLam: H.TANWIN_FATHAH
        },
        { // تِفْعَالًا
          hurufZiyadahAwal: H.TA + H.KASRAH, // تِ
          faFiil: fa, harakatFa: H.SUKUN,
          ainFiil: ain, harakatAin: H.FATHAH,
          hurufZiyadahSetelahAin: H.ALIF, // ا
          lamFiil: lam, harakatLam: H.TANWIN_FATHAH
        }
      ];
    case "Isim Fa'il":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH, // مُ
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.KASRAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH, // مُ
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Fi'il Amr":
      return { // فَعِّلْ
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    case "Fi'il Nahyi":
      return {
        hurufZiyadahAwal: "\u0644\u064e\u0627", 
        hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.DHAMMAH, // تُ
        faFiil: fa, harakatFa: H.FATHAH,
        ainFiil: ain, harakatAin: H.TASYDID + H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    default:
      return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WAZAN FAA'ALA (فَاعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildFaa3ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata | AnatomiKata[] {
  switch (shighot) {
    case "Fi'il Madhi":
      return {
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.FATHAH,
        lamFiil: lam, harakatLam: H.FATHAH
      };
    case "Fi'il Mudhari'":
      return {
        hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.DHAMMAH,
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.DHAMMAH
      };
    case "Masdar":
      return [
        { // مُفَاعَلَةً
          hurufZiyadahAwal: H.MIM + H.DHAMMAH,
          faFiil: fa, harakatFa: H.FATHAH,
          hurufZiyadahTengah: H.ALIF,
          ainFiil: ain, harakatAin: H.FATHAH,
          lamFiil: lam, harakatLam: H.FATHAH,
          hurufZiyadahAkhir: H.TA_MARBUTHAH + H.TANWIN_FATHAH
        },
        { // فِعَالًا
          faFiil: fa, harakatFa: H.KASRAH,
          ainFiil: ain, harakatAin: H.FATHAH,
          hurufZiyadahSetelahAin: H.ALIF,
          lamFiil: lam, harakatLam: H.TANWIN_FATHAH
        },
        { // فِيْعَالًا
          faFiil: fa, harakatFa: H.KASRAH,
          hurufZiyadahTengah: H.YA + H.SUKUN, // يْ
          ainFiil: ain, harakatAin: H.FATHAH,
          hurufZiyadahSetelahAin: H.ALIF,
          lamFiil: lam, harakatLam: H.TANWIN_FATHAH
        }
      ];
    case "Isim Fa'il":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH,
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return {
        hurufZiyadahAwal: H.MIM + H.DHAMMAH,
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.FATHAH,
        lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH
      };
    case "Fi'il Amr":
      return {
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    case "Fi'il Nahyi":
      return {
        hurufZiyadahAwal: "\u0644\u064e\u0627", 
        hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.DHAMMAH,
        faFiil: fa, harakatFa: H.FATHAH,
        hurufZiyadahTengah: H.ALIF,
        ainFiil: ain, harakatAin: H.KASRAH,
        lamFiil: lam, harakatLam: H.SUKUN
      };
    default:
      return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WAZAN TAFA''ALA (تَفَعَّلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildTafa33ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.DHAMMAH, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi":
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH + H.FATHAH + H.TA, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. WAZAN TAFAA'ALA (تَفَاعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildTafaa3ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.DHAMMAH, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr":
      return { hurufZiyadahAwal: H.TA + H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi":
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH + H.FATHAH + H.TA, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, hurufZiyadahTengah: H.ALIF, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. WAZAN IFTA'ALA (اِفْتَعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfta3ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'":
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.KASRAH, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi":
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, hurufZiyadahTengah: H.TA + H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. WAZAN INFA'ALA (اِنْفَعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildInfa3ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.NUN + H.SUKUN, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'":
      return { hurufZiyadahAwal: H.NUN + H.SUKUN, hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.NUN + H.SUKUN, faFiil: fa, harakatFa: H.KASRAH, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.NUN + H.SUKUN, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.NUN + H.SUKUN, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.NUN + H.SUKUN, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi":
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH + H.FATHAH + H.NUN, harakatMudhoroah: H.SUKUN, faFiil: fa, harakatFa: H.FATHAH, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. WAZAN ISTAF'ALA (اِسْتَفْعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIstaf3ala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.SIN + H.SUKUN + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'":
      return { hurufZiyadahAwal: H.SIN + H.SUKUN + H.TA + H.FATHAH, hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.SIN + H.SUKUN + H.TA + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.SIN + H.SUKUN + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan":
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH + H.SIN + H.SUKUN + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr":
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH + H.SIN + H.SUKUN + H.TA + H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi":
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH + H.FATHAH + H.SIN + H.SUKUN + H.TA, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. WAZAN IF'ALLA (اِفْعَلَّ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfalla(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi": // اِحْمَرَّ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Mudhari'": // يَحْمَرُّ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.DHAMMAH };
    case "Masdar": // اِحْمِرَارًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, lamFiilKedua: lam, harakatLamKedua: H.FATHAH + H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُحْمَرٌّ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُحْمَرٌّ (sama dg Fa'il untuk bab ini karena idghom)
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِحْمَرِرْ / اِحْمَرَّ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Nahyi": // لَا تَحْمَرَّ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. WAZAN IF'AALLA (اِفْعَالَّ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfaalla(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi": // اِحْمَارَّ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Mudhari'": // يَحْمَارُّ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.DHAMMAH };
    case "Masdar": // اِحْمِيرَارًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, hurufZiyadahSetelahAin: H.YA + H.SUKUN, lamFiilKedua: lam, harakatLamKedua: H.FATHAH + H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُحْمَارٌّ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُحْمَارٌّ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِحْمَارِرْ / اِحْمَارَّ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    case "Fi'il Nahyi": // لَا تَحْمَارَّ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.ALIF, lamFiil: lam, harakatLam: H.TASYDID + H.FATHAH };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. WAZAN IF'AW'ALA (اِفْعَوْعَلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfawala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi": // اِعْشَوْشَبَ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'": // يَعْشَوْشِبُ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.KASRAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar": // اِعْشِيْشَابًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, hurufZiyadahSetelahAin: H.YA + H.SUKUN + ain + H.FATHAH + H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُعْشَوْشِبٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُعْشَوْشَبٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِعْشَوْشِبْ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi": // لَا تَعْشَوْشِبْ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.SUKUN + ain + H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. WAZAN IF'AWWALA (اِفْعَوَّلَ)
// ─────────────────────────────────────────────────────────────────────────────
function buildIfawwala(fa: string, ain: string, lam: string, shighot: string): AnatomiKata {
  switch (shighot) {
    case "Fi'il Madhi": // اِعْلَوَّطَ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.FATHAH };
    case "Fi'il Mudhari'": // يَعْلَوِّطُ
      return { hurufMudhoroah: H.YA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.KASRAH, lamFiil: lam, harakatLam: H.DHAMMAH };
    case "Masdar": // اِعْلِوَّاطًا
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.KASRAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.FATHAH + H.ALIF, lamFiil: lam, harakatLam: H.TANWIN_FATHAH };
    case "Isim Fa'il": // مُعْلَوِّطٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.KASRAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Isim Maf'ul":
    case "Masdar Mim":
    case "Isim Zaman/Makan": // مُعْلَوَّطٌ
      return { hurufZiyadahAwal: H.MIM + H.DHAMMAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.FATHAH, lamFiil: lam, harakatLam: H.TANWIN_DHAMMAH };
    case "Fi'il Amr": // اِعْلَوِّطْ
      return { hurufZiyadahAwal: H.HAMZAH_BAWAH + H.KASRAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    case "Fi'il Nahyi": // لَا تَعْلَوِّطْ
      return { hurufZiyadahAwal: "\u0644\u064e\u0627", hurufMudhoroah: " " + H.TA_MUDH, harakatMudhoroah: H.FATHAH, faFiil: fa, harakatFa: H.SUKUN, ainFiil: ain, harakatAin: H.FATHAH, hurufZiyadahSetelahAin: H.WAWU + H.TASYDID + H.KASRAH, lamFiil: lam, harakatLam: H.SUKUN };
    default: return { faFiil: "", harakatFa: "", ainFiil: "-", harakatAin: "", lamFiil: "", harakatLam: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHER UTAMA MAZID
// ─────────────────────────────────────────────────────────────────────────────

export function bangunAnatomiMazid(
  fa: string, 
  ain: string, 
  lam: string, 
  babStringId: string, 
  shighot: string
): AnatomiKata | AnatomiKata[] {
  
  const wazan = normalizeBabMazid(babStringId);

  switch (wazan) {
    case "af'ala": return buildAfala(fa, ain, lam, shighot);
    case "fa''ala": return buildFa33ala(fa, ain, lam, shighot);
    case "faa'ala": return buildFaa3ala(fa, ain, lam, shighot);
    case "tafa''ala": return buildTafa33ala(fa, ain, lam, shighot);
    case "tafaa'ala": return buildTafaa3ala(fa, ain, lam, shighot);
    case "ifta'ala": return buildIfta3ala(fa, ain, lam, shighot);
    case "infa'ala": return buildInfa3ala(fa, ain, lam, shighot);
    case "istaf'ala": return buildIstaf3ala(fa, ain, lam, shighot);
    
    // Rare Khumasi & Sudasi
    case "if'alla": return buildIfalla(fa, ain, lam, shighot);
    case "if'aalla": return buildIfaalla(fa, ain, lam, shighot);
    case "if'aw'ala": return buildIfawala(fa, ain, lam, shighot);
    case "if'awwala": return buildIfawwala(fa, ain, lam, shighot);
      
    default:
      throw new Error(`Wazan Mazid dengan ID '${babStringId}' (Wazan: ${wazan}) tidak dikenali.`);
  }
}
