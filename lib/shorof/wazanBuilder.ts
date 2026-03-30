/**
 * lib/shorof/wazanBuilder.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pembangun Anatomi Kata (Positional Mapper).
 *
 * Modul ini bertugas mengambil sebuah WordContext (akar kata + bab + shighot),
 * lalu menghasilkan AnatomiKata — peta posisi haruf yang merepresentasikan
 * wazan/pola morfologis kata tersebut secara atom demi atom.
 *
 * Dari AnatomiKata, fungsi `renderAnatomiToString` merangkai kembali menjadi
 * satu string kata Arab berharakat yang lengkap.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AnatomiKata, HarakatMap, WordContext } from "./types";
import { hapusHarakat } from "./bina";
import { bangunAnatomiMazid } from "./mazidBuilder";

// ══════════════════════════════════════════════════════════════════════════════
//  Konstanta Unicode Harakat & Huruf
// ══════════════════════════════════════════════════════════════════════════════

const H = {
  // ── Harakat ──────────────────────────────────────────────────────────────
  FATHAH: "\u064E", // (  َ  )
  DHAMMAH: "\u064F", // (  ُ  )
  KASRAH: "\u0650", // (  ِ  )
  SUKUN: "\u0652", // (  ْ  )
  TASYDID: "\u0651", // (  ّ  )
  TANWIN_DHAMMAH: "\u064C", // (  ٌ  ) – tanwin dhammah (rafak)
  TANWIN_FATHAH: "\u064B", // (  ً  ) – tanwin fathah (nashab)
  TANWIN_KASRAH: "\u064D", // (  ٍ  ) – tanwin kasrah (jar)

  // ── Huruf Ziyadah (Tambahan) ──────────────────────────────────────────────
  YA_MUDHARAAH: "\u064A", // ي — huruf mudhara'ah paling umum
  TA_MUDHARAAH: "\u062A", // ت
  NUN_MUDHARAAH: "\u0646", // ن
  HAMZAH_MUDH: "\u0623", // أ — hamzah mudhara'ah (mutakallim)

  ALIF: "\u0627", // ا
  WAWU: "\u0648", // و
  YA: "\u064A", // ي
  MIM: "\u0645", // م
  LAA: "\u0644\u0627", // لا
  TA_MARBUTHAH: "\u0629", // ة
  NUN_TANWIN: "\u0646", // ن (nun tanwin pada sebagian wazan)
  HAMZAH_ATAS: "\u0623", // أ (hamzah di atas alif — untuk Amr dan bentuk nominal)
} as const;

// ══════════════════════════════════════════════════════════════════════════════
//  Tabel Harakat per Bab
// ══════════════════════════════════════════════════════════════════════════════

/**
 * BAB_HARAKAT — Peta harakat 'Ain al-Fi'l untuk Madhi dan Mudhari'
 * sesuai pembagian 6 bab tradisional ilmu Shorof.
 *
 * Referensi: Kitab Amtsilah al-Tasrifiyyah
 *   Bab 1 : فَعَلَ – يَفْعُلُ  → Madhi: Fathah, Mudhari': Dhammah
 *   Bab 2 : فَعَلَ – يَفْعِلُ  → Madhi: Fathah, Mudhari': Kasrah
 *   Bab 3 : فَعَلَ – يَفْعَلُ  → Madhi: Fathah, Mudhari': Fathah
 *   Bab 4 : فَعِلَ – يَفْعَلُ  → Madhi: Kasrah, Mudhari': Fathah
 *   Bab 5 : فَعُلَ – يَفْعُلُ  → Madhi: Dhammah, Mudhari': Dhammah
 *   Bab 6 : فَعِلَ – يَفْعِلُ  → Madhi: Kasrah, Mudhari': Kasrah
 */
const BAB_HARAKAT: Record<1 | 2 | 3 | 4 | 5 | 6, HarakatMap> = {
  1: { harakatAinMadhi: H.FATHAH, harakatAinMudhari: H.DHAMMAH },
  2: { harakatAinMadhi: H.FATHAH, harakatAinMudhari: H.KASRAH },
  3: { harakatAinMadhi: H.FATHAH, harakatAinMudhari: H.FATHAH },
  4: { harakatAinMadhi: H.KASRAH, harakatAinMudhari: H.FATHAH },
  5: { harakatAinMadhi: H.DHAMMAH, harakatAinMudhari: H.DHAMMAH },
  6: { harakatAinMadhi: H.KASRAH, harakatAinMudhari: H.KASRAH },
};

/**
 * HARAKAT_AMR_LAM — Harakat Lam al-Fi'l pada Fi'il Amr, berdasarkan bab.
 * Amr dihasilkan dari Mudhari': buang huruf mudhara'ah, sukunkan 'ain pertama.
 * Format uf'ul (bab 1,5), if'il (bab 2,6), if'al (bab 3,4).
 */
const HARAKAT_AMR_AIN: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: H.SUKUN,   // اُفْعُلْ
  2: H.SUKUN,   // اِفْعِلْ
  3: H.SUKUN,   // اِفْعَلْ
  4: H.SUKUN,   // اِفْعَلْ
  5: H.SUKUN,   // اُفْعُلْ
  6: H.SUKUN,   // اِفْعِلْ
};

/**
 * Harakat Hamzah Washal pada Fi'il Amr per bab.
 * Dhammah jika Mudhari' bermudhari' dhammah (Bab 1, 5), selainnya Kasrah.
 */
const HARAKAT_HAMZAH_AMR: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: H.DHAMMAH, 2: H.KASRAH, 3: H.KASRAH,
  4: H.KASRAH, 5: H.DHAMMAH, 6: H.KASRAH,
};

// ══════════════════════════════════════════════════════════════════════════════
//  Helper Internal
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Memecah akar kata 3 huruf menjadi tuple [fa, ain, lam].
 * Harakat pada input akan dibersihkan terlebih dahulu.
 */
function pecahAkar(akarKata: string): string[] {
  const bersih = hapusHarakat(akarKata);
  if (bersih.length < 3) {
    throw new Error(`Akar kata tidak valid: "${akarKata}" (minimal 3 huruf)`);
  }
  return bersih.split("");
}

// ══════════════════════════════════════════════════════════════════════════════
//  Builder per Shighot
// ══════════════════════════════════════════════════════════════════════════════

/** Fi'il Madhi — فَعَلَ / فَعِلَ / فَعُلَ sesuai bab */
function buildMadhi(fa: string, ain: string, lam: string, bab: 1 | 2 | 3 | 4 | 5 | 6): AnatomiKata {
  const { harakatAinMadhi } = BAB_HARAKAT[bab];
  return {
    faFiil: fa,
    harakatFa: H.FATHAH,           // Fa' selalu Fathah pada Madhi Tsulatsi
    ainFiil: ain,
    harakatAin: harakatAinMadhi,   // Sesuai bab (Fathah/Kasrah/Dhammah)
    lamFiil: lam,
    harakatLam: H.FATHAH,          // Lam selalu Fathah pada bentuk mufrad muzakkar
  };
}

/** Fi'il Mudhari' — يَفْعُلُ / يَفْعِلُ / يَفْعَلُ sesuai bab */
function buildMudhari(fa: string, ain: string, lam: string, bab: 1 | 2 | 3 | 4 | 5 | 6): AnatomiKata {
  const { harakatAinMudhari } = BAB_HARAKAT[bab];
  return {
    hurufMudhoroah: H.YA_MUDHARAAH,
    harakatMudhoroah: H.FATHAH,    // Huruf mudhara'ah selalu Fathah
    faFiil: fa,
    harakatFa: H.SUKUN,            // Fa' sukun pada Mudhari'
    ainFiil: ain,
    harakatAin: harakatAinMudhari, // Sesuai bab
    lamFiil: lam,
    harakatLam: H.DHAMMAH,        // Lam berdhammah pada Mudhari' Marfu' (rafa')
  };
}

/** Masdar — ada banyak wazan, gunakan wazan paling umum: فَعْلًا / فُعُولًا
 *  Wazan pastinya bergantung pada bab dan akar; ini adalah pendekatan heuristik. */
function buildMasdar(fa: string, ain: string, lam: string, bab: 1 | 2 | 3 | 4 | 5 | 6): AnatomiKata {
  // Bab 1 → فَعْلًا (fathah fa, sukun ain, fathah+tanwin lam)
  // Bab 2 → فَعْلًا
  // Bab 3 → فَتْحًا → serupa
  // Bab 4 → فَعَلًا (fathah keduanya)
  // Default: فَعْلًا — wazan masdar paling umum Bab 1–3
  const harakatAin = (bab === 4) ? H.FATHAH : H.SUKUN;
  return {
    faFiil: fa,
    harakatFa: H.FATHAH,
    ainFiil: ain,
    harakatAin,
    lamFiil: lam,
    harakatLam: H.TANWIN_FATHAH, // Tanwin Fathah sebagai tanda Nasab/Masdar
  };
}

/**
 * Masdar Mim — مَفْعَلٌ / مَفْعِلٌ
 *
 * Aturan pemilihan harakat 'Ain:
 *   - Default                 → Fathah  (مَفْعَلٌ)
 *   - Bab 2 atau Bab 6        → Kasrah  (مَفْعِلٌ)
 *   - Bina' Mitsal Wawi       → Kasrah  (مَفْعِلٌ, karena huruf illat di Fa')
 *
 * PENTING: Fa' al-Fi'l di-SUKUN (bukan Fathah seperti Masdar biasa)
 * karena pada wazan مَفْعَل, harakat Fa' adalah Sukun:
 *   م  (Fathah di Mim ziyadah) + Fa' (Sukun) + 'Ain (Fathah/Kasrah) + لٌ
 */
function buildMasdarMim(
  fa: string,
  ain: string,
  lam: string,
  bab: 1 | 2 | 3 | 4 | 5 | 6,
  bina?: string
): AnatomiKata {
  // Tentukan harakat 'Ain berdasarkan bab dan bina'
  const pakaKasrah = bab === 2 || bab === 6 || bina === "Mitsal Wawi";
  const harakatAin: string = pakaKasrah ? H.KASRAH : H.FATHAH;

  // Naqish Wawi: Masdar Mim/Zaman berakhiran Alif Maqshurah + tanwin fathah (مَدْعًى)
  // Naqish Ya'i: sama — wazan مَفْعَل dengan Lam = ى
  // مَدْعًى: Tanwin Fathah HARUS ditulis sebelum Alif Maqshurah (ى)
  // Unicode: م + َ + د + ْ + ع + ً + ى
  const isNaqish = bina?.startsWith("Naqish") || bina?.startsWith("Lafif");

  if (isNaqish) {
    return {
      hurufZiyadahAwal: H.MIM + H.FATHAH,
      faFiil: fa,
      harakatFa: H.SUKUN,
      ainFiil: ain,
      // Kunci: tanwin fathah (ً) di harakatAin SEBELUM ى, bukan setelahnya
      // Ini menghasilkan: عً + ى = عًى (benar: مَدْعًى)
      harakatAin: H.TANWIN_FATHAH,  // ً (tanwin fathah)
      lamFiil: "\u0649",              // ى – Alif Maqshurah (tanpa harakat)
      harakatLam: "",
    };
  }

  // Override harakatAin untuk Naqish: tambahkan tanwin fathah setelah harakat biasa
  // Sebenarnya, anatomi standar: ain + harakatAin + lam + harakatLam
  // Untuk مَدْعًى yang benar:
  //   ain = ع, harakatAin = ً (tanwin fathah), lam = ى, harakatLam = ""
  // Jadi: re-return dengan harakatAin = TANWIN_FATHAH

  return {
    hurufZiyadahAwal: H.MIM + H.FATHAH, // مَ (Mim + Fathah sebagai prefix)
    faFiil: fa,
    harakatFa: H.SUKUN,   // Fa' SUKUN pada wazan مَفْعَل
    ainFiil: ain,
    harakatAin,
    lamFiil: lam,
    harakatLam: H.TANWIN_DHAMMAH, // مَفْعَلٌ berakhiran tanwin dhammah (marfu')
  };
}

/** Isim Fa'il — فَاعِلٌ */
function buildIsimFaail(fa: string, ain: string, lam: string): AnatomiKata {
  return {
    faFiil: fa,
    harakatFa: H.FATHAH,
    hurufZiyadahTengah: H.ALIF,   // ا Ziyadah antara Fa' dan 'Ain
    ainFiil: ain,
    harakatAin: H.KASRAH,         // 'Ain selalu Kasrah: فَاعِل
    lamFiil: lam,
    harakatLam: H.TANWIN_DHAMMAH,
  };
}

/** Isim Maf'ul — مَفْعُولٌ */
/** Isim Maf'ul — مَفْعُولٌ */
function buildIsimMafuul(fa: string, ain: string, lam: string): AnatomiKata {
  return {
    hurufZiyadahAwal: H.MIM + H.FATHAH, // مَ 
    faFiil: fa,
    harakatFa: H.SUKUN, // مَفْـ
    ainFiil: ain,
    harakatAin: H.DHAMMAH, // ـعُـ

    // GUNAKAN INI BUKAN ZiyadahAkhir:
    hurufZiyadahSetelahAin: H.WAWU, // ـو (Wawu madd tanda maf'ul — tanpa sukun eksplisit)

    // Kembalikan Lam Fi'il ke tempat asalnya:
    lamFiil: lam, // ـل
    harakatLam: H.TANWIN_DHAMMAH, // ٌ
  };
}

/** Fi'il Amr — اُفْعُلْ / اِفْعِلْ / اِفْعَلْ sesuai bab */
function buildAmr(fa: string, ain: string, lam: string, bab: 1 | 2 | 3 | 4 | 5 | 6): AnatomiKata {
  const { harakatAinMudhari } = BAB_HARAKAT[bab];
  const harakatHamzah = HARAKAT_HAMZAH_AMR[bab];
  return {
    hurufZiyadahAwal: "\u0627" + harakatHamzah, // اُ/اِ (Hamzah Washal — ditulis tanpa tanda hamzah)
    faFiil: fa,
    harakatFa: H.SUKUN,            // Fa' sukun
    ainFiil: ain,
    harakatAin: harakatAinMudhari, // Sama dengan harakat 'Ain Mudhari'
    lamFiil: lam,
    harakatLam: H.SUKUN,           // Lam sukun pada Amr Mufrad Muzakkar
  };
}

/** Fi'il Nahyi — لَا تَفْعُلْ / لَا تَفْعِلْ / لَا تَفْعَلْ sesuai bab */
function buildNahyi(fa: string, ain: string, lam: string, bab: 1 | 2 | 3 | 4 | 5 | 6): AnatomiKata {
  const { harakatAinMudhari } = BAB_HARAKAT[bab];
  // لَا = Lam-Fathah + Alif (tanpa harakat) + spasi + Ta' Mudhara'ah
  // Urutan karakter: ل + َ (fathah) + ا (alif) + ' ' + ت
  return {
    hurufZiyadahAwal: "\u0644\u064e\u0627 \u062a", // لَا ت (Lam+Fathah+Alif+Spasi+Ta')
    harakatMudhoroah: H.FATHAH,   // Ta' mudhara'ah Fathah
    faFiil: fa,
    harakatFa: H.SUKUN,
    ainFiil: ain,
    harakatAin: harakatAinMudhari,
    lamFiil: lam,
    harakatLam: H.SUKUN,           // Jazm (Sukun) karena didahului لَا
  };
}

/** Isim Zaman/Makan — مَفْعَلٌ / مَفْعِلٌ (sama dengan Masdar Mim) */
function buildIsimZaman(
  fa: string,
  ain: string,
  lam: string,
  bab: 1 | 2 | 3 | 4 | 5 | 6,
  bina?: string
): AnatomiKata {
  // Isim Zaman dan Makan ber-wazan identik dengan Masdar Mim pada Tsulatsi Mujarrad
  // Teruskan bina' agar Naqish mendapat Alif Maqshurah yang benar
  return buildMasdarMim(fa, ain, lam, bab, bina);
}

/**
 * Isim Alat — Dinamis berdasarkan context.polaAlat
 *
 * Tiga wazan resmi dalam Shorof klasik:
 *   مِفْعَلٌ  (default)  : Mim Kasrah + Fa' Sukun + Ain Fathah + Lam Tanwin Dhammah
 *   مِفْعَالٌ            : sama + Alif Zaidah antara Ain dan Lam
 *   مِفْعَلَةٌ           : Lam Fathah + Ta' Marbuthah di akhir
 *   "Tidak Ada" / undefined: return anatomi kosong → dirender sebagai "-"
 */
function buildIsimAlat(
  fa: string,
  ain: string,
  lam: string,
  polaAlat?: WordContext["polaAlat"]
): AnatomiKata {
  // Jika tidak ada wazan Alat, kembalikan anatomi minimal (rendernya jadi "")
  if (polaAlat === "Tidak Ada") {
    return { faFiil: "-", harakatFa: "", ainFiil: "", harakatAin: "", lamFiil: "", harakatLam: "" };
  }

  // Base anatomi: مِفْعَلٌ (Kasrah di Mim, Sukun di Fa', Fathah di Ain)
  const base: AnatomiKata = {
    hurufZiyadahAwal: H.MIM + H.KASRAH, // مِ (Mim + Kasrah)
    faFiil: fa,
    harakatFa: H.SUKUN,    // Fa' Sukun
    ainFiil: ain,
    harakatAin: H.FATHAH,  // 'Ain Fathah
    lamFiil: lam,
    harakatLam: H.TANWIN_DHAMMAH, // Lam + Tanwin Dhammah: مِفْعَلٌ
  };

  // مِفْعَالٌ: tambah Alif Zaidah di antara Ain dan Lam
  if (polaAlat === "مِفْعَالٌ") {
    // Ganti "hurufZiyadahTengah" menjadi "hurufZiyadahSetelahAin"
    base.hurufZiyadahSetelahAin = H.ALIF;
  }

  // مِفْعَلَةٌ: Lam Fathah + Ta' Marbuthah di akhir
  if (polaAlat === "مِفْعَلَةٌ") {
    base.harakatLam = H.FATHAH;      // Lam Fathah
    base.hurufZiyadahAkhir = H.TA_MARBUTHAH + H.TANWIN_DHAMMAH; // ةٌ
  }

  return base;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Fungsi Utama: bangunAnatomi
// ══════════════════════════════════════════════════════════════════════════════

/**
 * bangunAnatomi — Menghasilkan AnatomiKata berdasarkan WordContext.
 *
 * Fungsi ini merupakan dispatcher utama yang memilih builder yang tepat
 * berdasarkan `shighot`, lalu menyerahkan detail harakat kepada masing-masing
 * builder yang sudah memahami babnya.
 *
 * @param context - WordContext berisi akarKata, bab, bina, dan shighot
 * @returns AnatomiKata — peta posisi huruf yang lengkap
 * @throws Error jika akar kata tidak valid atau shighot tidak dikenali
 */
export function bangunAnatomi(context: WordContext): AnatomiKata | AnatomiKata[] {
  const { akarKata, bab, bina, shighot, polaAlat } = context;
  const hurufAkar = pecahAkar(akarKata);
  const fa = hurufAkar[0];
  const ain = hurufAkar[1];
  const lam1 = hurufAkar[2];
  const lam2 = hurufAkar.length > 3 ? hurufAkar[3] : "";

  if (typeof bab === "string") {
    // Jika 4 huruf, arahkan ke rubaiBuilder, jika 3 arahkan ke mazidBuilder
    if (hurufAkar.length === 4) {
      // Lazy import supaya tidak circular / terlalu panjang di sini
      // TODO: panggil bangunAnatomiRubai
      const { bangunAnatomiRubai } = require('./rubaiBuilder');
      return bangunAnatomiRubai(fa, ain, lam1, lam2, bab, shighot as string);
    }
    // Delegasikan pembangunan wazan Mazid ke mazidBuilder
    return bangunAnatomiMazid(fa, ain, lam1, bab, shighot as string);
  }

  // Dari sini ke bawah, TypeScript tahu bahwa `bab` pasti 1 | 2 | 3 | 4 | 5 | 6
  // Asumsi Tsulatsi Mujarrod (harus 3 huruf akar)
  const lam = lam1;
  switch (shighot) {
    case "Fi'il Madhi":
      return buildMadhi(fa, ain, lam, bab);

    case "Fi'il Mudhari'":
      return buildMudhari(fa, ain, lam, bab);

    case "Masdar":
      return buildMasdar(fa, ain, lam, bab);

    case "Masdar Mim":
      // Teruskan bina' agar logika pemilihan harakat 'Ain lebih akurat
      return buildMasdarMim(fa, ain, lam, bab, bina);

    case "Isim Fa'il":
      return buildIsimFaail(fa, ain, lam);

    case "Isim Maf'ul":
      return buildIsimMafuul(fa, ain, lam);

    case "Fi'il Amr":
      return buildAmr(fa, ain, lam, bab);

    case "Fi'il Nahyi":
      return buildNahyi(fa, ain, lam, bab);

    case "Isim Zaman/Makan":
      // Isim Zaman/Makan ber-wazan identik dengan Masdar Mim
      // Teruskan bina' agar Naqish mendapat Alif Maqshurah
      return buildIsimZaman(fa, ain, lam, bab, bina);

    case "Isim Alat":
      // Teruskan polaAlat agar wazan dipilih secara dinamis
      return buildIsimAlat(fa, ain, lam, polaAlat);

    default:
      // Fallback: kembalikan anatomi Madhi sebagai default
      console.warn(`[wazanBuilder] Shighot tidak dikenali: "${shighot}", fallback ke Madhi.`);
      return buildMadhi(fa, ain, lam, bab);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  Renderer: AnatomiKata → String
// ══════════════════════════════════════════════════════════════════════════════

/**
 * renderAnatomiToString — Merangkai semua slot AnatomiKata menjadi satu
 * string kata Arab berharakat yang utuh dan termuat secara berurutan.
 *
 * Urutan perangkaian:
 *   1. hurufZiyadahAwal   (jika ada)
 *   2. hurufMudhoroah + harakatMudhoroah (jika ada)
 *   3. faFiil + harakatFa
 *   4. hurufZiyadahTengah (jika ada)
 *   5. ainFiil + harakatAin
 *   6. lamFiil + harakatLam
 *   7. hurufZiyadahAkhir  (jika ada)
 *
 * @param anatomi - AnatomiKata yang sudah dibangun
 * @returns String kata Arab berharakat
 */
export function renderAnatomiToString(anatomi: AnatomiKata): string {
  const bagian: string[] = [];

  // 1. Ziyadah di awal (misal: م) + Harakatnya
  if (anatomi.hurufZiyadahAwal) {
    bagian.push(anatomi.hurufZiyadahAwal);
    // Jika tidak ada huruf mudhara'ah, berarti harakatMudhoroah adalah milik Ziyadah Awal (Mim)
    if (!anatomi.hurufMudhoroah && anatomi.harakatMudhoroah) {
      bagian.push(anatomi.harakatMudhoroah);
    }
  }

  // 2. Huruf Mudhara'ah + harakatnya (khusus Mudhari'/Nahyi)
  if (anatomi.hurufMudhoroah) {
    bagian.push(anatomi.hurufMudhoroah);
    if (anatomi.harakatMudhoroah) bagian.push(anatomi.harakatMudhoroah);
  }

  // 3. Fa' al-Fi'l + harakatnya
  if (anatomi.faFiil) {
    bagian.push(anatomi.faFiil);
    if (anatomi.harakatFa) bagian.push(anatomi.harakatFa); // Aman dari undefined
  }

  // 4. Ziyadah SETELAH Fa' (misal: ا pada Isim Fa'il فَاعِل)
  if (anatomi.hurufZiyadahTengah) {
    bagian.push(anatomi.hurufZiyadahTengah);
  }

  // 5. 'Ain al-Fi'l + harakatnya
  if (anatomi.ainFiil) {
    bagian.push(anatomi.ainFiil);
    if (anatomi.harakatAin) bagian.push(anatomi.harakatAin);
  }

  // 6. Ziyadah SETELAH 'Ain (misal: وْ pada Isim Maf'ul, atau ا pada Isim Alat)
  if (anatomi.hurufZiyadahSetelahAin) {
    bagian.push(anatomi.hurufZiyadahSetelahAin);
  }

  // 6.5 Lam Fi'il Kedua (Khusus Wazan Ruba'i / Akar 4 Huruf)
  if (anatomi.lamFiilKedua) {
    bagian.push(anatomi.lamFiilKedua);
    if (anatomi.harakatLamKedua) bagian.push(anatomi.harakatLamKedua);
  }

  // 7. Lam al-Fi'l + harakatnya
  // Catatan: lamFiil bisa kosong saat Idghom (kaidah 2) — tapi harakatLam
  // tetap harus dirender karena ia adalah harakat akhir dari huruf yang diidghom.
  if (anatomi.lamFiil) {
    bagian.push(anatomi.lamFiil);
    if (anatomi.harakatLam) bagian.push(anatomi.harakatLam);
  } else if (!anatomi.lamFiil && anatomi.harakatLam) {
    // Kasus Idghom: lamFiil kosong tapi harakatLam masih harus tampil
    // (misal: مَدَّ dimana lam = '' dan harakatLam = fathah)
    bagian.push(anatomi.harakatLam);
  }

  // 8. Ziyadah di akhir (misal: ةٌ pada mif'alah)
  if (anatomi.hurufZiyadahAkhir) {
    bagian.push(anatomi.hurufZiyadahAkhir);
  }

  return bagian.join("");
}

// ══════════════════════════════════════════════════════════════════════════════
//  Fungsi Utilitas Publik Tambahan
// ══════════════════════════════════════════════════════════════════════════════

/**
 * bangunDanRender — Shortcut yang menggabungkan bangunAnatomi + renderAnatomiToString.
 * Berguna untuk penggunaan langsung tanpa perlu menyimpan AnatomiKata terpisah.
 *
 * @param context - WordContext
 * @returns String kata Arab berharakat
 */
export function bangunDanRender(context: WordContext): string {
  const anatomi = bangunAnatomi(context);
  if (Array.isArray(anatomi)) {
    return anatomi.map(renderAnatomiToString).join(" / ");
  }
  return renderAnatomiToString(anatomi);
}

/**
 * getWazanLabel — Mengembalikan label wazan dalam format tradisional.
 * Berguna untuk UI yang menampilkan "Wazan: فَعَلَ – يَفْعُلُ" dll.
 *
 * @param bab - Nomor bab (1–6)
 * @returns String label wazan
 */
export function getWazanLabel(bab: 1 | 2 | 3 | 4 | 5 | 6 | string): string {
  if (typeof bab === "string") {
    return bab; // Untuk wazan mazid, kembalikan identifier-nya langsung
  }
  const labels: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: "فَعَلَ – يَفْعُلُ",
    2: "فَعَلَ – يَفْعِلُ",
    3: "فَعَلَ – يَفْعَلُ",
    4: "فَعِلَ – يَفْعَلُ",
    5: "فَعُلَ – يَفْعُلُ",
    6: "فَعِلَ – يَفْعِلُ",
  };
  return labels[bab];
}
