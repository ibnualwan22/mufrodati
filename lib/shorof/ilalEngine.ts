/**
 * lib/shorof/ilalEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Mesin I'lal berbasis ANATOMI KATA (Positional I'lal Engine).
 *
 * Berbeda dengan mesin string-regex sebelumnya, engine ini bekerja pada
 * objek `AnatomiKata` secara langsung — memodifikasi properti seperti
 * `ainFiil`, `harakatAin`, `faFiil`, dsb — sebelum merender hasilnya
 * menjadi string final. Pendekatan ini jauh lebih akurat dan mudah diperluas.
 *
 * Urutan Pipeline Kaidah:
 *   Kaidah 1  → Hamzah Washal (Fi'il Amr)
 *   Kaidah 3  → Wawu/Ya → Alif (setelah Fathah)
 *   Kaidah 4  → Naql (Pindah Harakat ke huruf sebelumnya)
 *   Kaidah 5  → Wawu/Ya → Hamzah (setelah Alif Zaidah)
 *   Kaidah 7  → Buang harakat Wawu/Ya di akhir
 *   Kaidah 9  → Buang Wawu Mitsal (antara Fathah dan Kasrah)
 *   Kaidah 10 → Wawu sukun setelah Kasrah → Ya
 *   Kaidah 11 → Idghom Wawu+Ya → YaYa (Tasydid)
 *   Kaidah 12 → Wawu akhir setelah Kasrah → Ya
 *   Kaidah 13 → Ya sukun setelah Dhammah → Wawu
 *   Kaidah 19 → Wawu antara Kasrah+Alif (Masdar Ajwaf) → Ya
 *   [TODO]     → Kaidah 2,6,8,14,15,16,17,18
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AnatomiKata, ProsesIlal, WordContext } from "./types";
import { renderAnatomiToString } from "./wazanBuilder";
import { deteksiBina } from "./bina";

// ══════════════════════════════════════════════════════════════════════════════
//  Konstanta Unicode Harakat & Huruf
// ══════════════════════════════════════════════════════════════════════════════

const H = {
  FATHAH: "\u064E", // َ
  DHAMMAH: "\u064F", // ُ
  KASRAH: "\u0650", // ِ
  SUKUN: "\u0652", // ْ
  TASYDID: "\u0651", // ّ
  TANWIN_DHAMMAH: "\u064C", // ٌ
  TANWIN_FATHAH: "\u064B", // ً
  TANWIN_KASRAH: "\u064D", // ٍ

  ALIF: "\u0627", // ا
  WAWU: "\u0648", // و
  YA: "\u064A", // ي
  HAMZAH: "\u0621", // ء
  HAMZAH_ATAS: "\u0623", // أ
  HAMZAH_BAWAH: "\u0625", // إ
  HAMZAH_YA: "\u0626", // ئ
  TA_MARBUTHAH: "\u0629", // ة
} as const;

// ══════════════════════════════════════════════════════════════════════════════
//  Tipe Pipeline
// ══════════════════════════════════════════════════════════════════════════════

/**
 * KaidahFn — Tipe setiap fungsi kaidah dalam pipeline.
 * Menerima copy anatomi (mutable) dan konteks word, lalu memodifikasinya
 * secara langsung. Mengembalikan true jika kaidah berhasil diterapkan.
 */
type KaidahFn = (anatomi: AnatomiKata, ctx: WordContext) => { diterapkan: boolean; pesan: string };

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: Klasifikasi Karakter
// ══════════════════════════════════════════════════════════════════════════════

const isIllat = (ch: string) => ch === H.WAWU || ch === H.YA || ch === H.ALIF;
const isHarakat = (str: string) => /^[\u064B-\u065F\u0670]*$/.test(str) && str.length > 0;

/** Apakah harakat ini "hidup" (bukan sukun/kosong/tanwin) */
const isHarakatHidup = (h: string) => h !== H.SUKUN && h !== "";

// ══════════════════════════════════════════════════════════════════════════════
//  Implementasi Kaidah (Anatomi-Mutative)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Kaidah 1 – Hamzah Washal pada Fi'il Amr
 * ──────────────────────────────────────────
 * Jika shighot = "Fi'il Amr" dan Fa' al-Fi'l bersukun (yang merupakan ciri
 * Amr setelah huruf mudhara'ah dibuang), tambahkan Hamzah Washal di awal.
 *
 * Harakat Hamzah Washal:
 *   - Dhammah → jika harakatAin adalah Dhammah (Bab 1 dan 5)
 *   - Kasrah  → selainnya
 */
const kaidah1HamzahWashal: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Fi'il Amr") return { diterapkan: false, pesan: "" };

  // Fa' sukun adalah kondisi pemicu (Amr tidak punya mudhara'ah)
  if (anatomi.harakatFa !== H.SUKUN) return { diterapkan: false, pesan: "" };

  // Jika sudah ada ziyadah awal (sudah diproses), skip
  if (anatomi.hurufZiyadahAwal) return { diterapkan: false, pesan: "" };

  // Pengecualian: Mahmuz Fa' — jika Fa' adalah Hamzah, tidak perlu tambah
  // Hamzah Washal karena kata sudah bisa dimulai dengan Hamzah langsung.
  // (Penulisannya ditangani kaidah rasm hamzah tersendiri)
  const HAMZAH_CHARS = new Set([H.HAMZAH, H.HAMZAH_ATAS, H.HAMZAH_BAWAH, H.HAMZAH_YA, "\u0624"]);
  if (HAMZAH_CHARS.has(anatomi.faFiil)) return { diterapkan: false, pesan: "" };

  // Tentukan harakat Hamzah Washal berdasarkan harakat 'Ain
  const harakatWashal = anatomi.harakatAin === H.DHAMMAH ? H.DHAMMAH : H.KASRAH;

  // Tambahkan Hamzah Washal di properti ziyadahAwal
  anatomi.hurufZiyadahAwal = H.HAMZAH_ATAS + harakatWashal;

  return {
    diterapkan: true,
    pesan: `Kaidah 1 – Hamzah Washal: Fi'il Amr diawali huruf sukun. ` +
      `Ditambahkan Hamzah Washal (${H.HAMZAH_ATAS + harakatWashal}) ` +
      `di awal agar lafadz bisa dimulai.`,
  };
};

/**
 * Kaidah 1b – Sima'i: Mahmuz Fa' Amr yang Dibuang Hamzahnya (Li Katsroti Isti'mal)
 * ─────────────────────────────────────────────────────────────────────────────────
 * Tiga kata kerja yang Amr-nya tidak mengikuti kaidah umum karena sering dipakai:
 *   أَمَرَ → مُرْ  (bukan اُؤْمُرْ)
 *   أَكَلَ → كُلْ  (bukan اُؤْكُلْ)
 *   أَخَذَ → خُذْ  (bukan اُؤْخُذْ)
 */
const kaidahSimaiMahmuzAmr: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Fi'il Amr") return { diterapkan: false, pesan: "" };
  if (!ctx.bina.startsWith("Mahmuz")) return { diterapkan: false, pesan: "" };

  // Cek apakah termasuk 3 kata sima'i
  // akarKata disimpan tanpa harakat, fa' = hamzah/أ
  // Identifikasi lewat ain+lam (karena fa' selalu hamzah untuk Mahmuz Fa')
  const ain = anatomi.ainFiil;
  const lam = anatomi.lamFiil;

  // أَمَرَ: ain=م, lam=ر
  if (ain === "م" && lam === "ر") {
    anatomi.hurufZiyadahAwal = "";
    anatomi.faFiil = "";
    anatomi.harakatFa = "";
    // مُرْ: ain=م (dhammah), lam=ر (sukun)
    anatomi.harakatAin = H.DHAMMAH;
    anatomi.harakatLam = H.SUKUN;
    return { diterapkan: true, pesan: "Sima'i: أَمَرَ → Amr = مُرْ (li katsroti isti'mal, hamzah dibuang)" };
  }

  // أَكَلَ: ain=ك, lam=ل
  if (ain === "ك" && lam === "ل") {
    anatomi.hurufZiyadahAwal = "";
    anatomi.faFiil = "";
    anatomi.harakatFa = "";
    // كُلْ: ain=ك (dhammah), lam=ل (sukun)
    anatomi.harakatAin = H.DHAMMAH;
    anatomi.harakatLam = H.SUKUN;
    return { diterapkan: true, pesan: "Sima'i: أَكَلَ → Amr = كُلْ (li katsroti isti'mal, hamzah dibuang)" };
  }

  // أَخَذَ: ain=خ, lam=ذ
  if (ain === "خ" && lam === "ذ") {
    anatomi.hurufZiyadahAwal = "";
    anatomi.faFiil = "";
    anatomi.harakatFa = "";
    // خُذْ: ain=خ (dhammah), lam=ذ (sukun)
    anatomi.harakatAin = H.DHAMMAH;
    anatomi.harakatLam = H.SUKUN;
    return { diterapkan: true, pesan: "Sima'i: أَخَذَ → Amr = خُذْ (li katsroti isti'mal, hamzah dibuang)" };
  }

  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah 1c – Rasm Hamzah pada Mahmuz Fa' Fi'il Amr (Bukan Sima'i)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ketika Mahmuz Fa' membentuk Amr, terjadi dua hamzah berurutan:
 *   Hamzah Washal (اُ/اِ) + Hamzah Fa' (sukun)
 * Kaidah Rasm Hamzah dua hamzah berurutan:
 *   - Washal berdhammah → Fa' Hamzah ditulis di atas Wawu (ؤ): اُؤْمُرْ
 *   - Washal berkasrah  → Fa' Hamzah ditulis di atas Ya  (ئ): اِئْسِرْ
 */
const kaidahMahmuzFaAmrRasmHamzah: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Fi'il Amr") return { diterapkan: false, pesan: "" };
  if (!ctx.bina.startsWith("Mahmuz")) return { diterapkan: false, pesan: "" };

  // Fa' harus hamzah dan harakatFa = SUKUN
  const HAMZAH_CHARS = new Set<string>([H.HAMZAH, H.HAMZAH_ATAS, H.HAMZAH_BAWAH]);
  if (!HAMZAH_CHARS.has(anatomi.faFiil)) return { diterapkan: false, pesan: "" };
  if (anatomi.harakatFa !== H.SUKUN) return { diterapkan: false, pesan: "" };

  // Harus sudah ada Hamzah Washal di hurufZiyadahAwal
  if (!anatomi.hurufZiyadahAwal) return { diterapkan: false, pesan: "" };

  // Tentukan harakat Hamzah Washal (karakter ke-2 dari hurufZiyadahAwal = harakat)
  // Struktur: hurufZiyadahAwal = "اُ" atau "اِ"
  const harakatWashal = anatomi.hurufZiyadahAwal.slice(-1); // ambil harakat terakhir

  if (harakatWashal === H.DHAMMAH) {
    // Hamzah Washal dhammah + Hamzah sukun → ؤ
    anatomi.faFiil = "\u0624"; // ؤ (hamzah di atas wawu)
    return {
      diterapkan: true,
      pesan: "Kaidah Rasm Hamzah: Dua hamzah berurutan (washal+fa'), washal ber-dhammah → Fa' Hamzah ditulis ؤ (اُؤْمُرْ)",
    };
  }

  if (harakatWashal === H.KASRAH) {
    // Hamzah Washal kasrah + Hamzah sukun → ئ
    anatomi.faFiil = H.HAMZAH_YA; // ئ (hamzah di atas ya)
    return {
      diterapkan: true,
      pesan: "Kaidah Rasm Hamzah: Dua hamzah berurutan (washal+fa'), washal ber-kasrah → Fa' Hamzah ditulis ئ (اِئْسِرْ)",
    };
  }

  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah 3 – Wawu/Ya Berharakat Setelah Fathah → Alif
 * ──────────────────────────────────────────────────────
 * Jika 'Ain al-Fi'l adalah Wawu atau Ya yang berharakat (hidup),
 * dan Fa' al-Fi'l sebelumnya berharakat Fathah,
 * maka ubah 'Ain menjadi Alif (tanpa harakat/madd).
 *
 * Berlaku untuk: Ajwaf Wawi/Ya'i (illat di 'Ain)
 * Contoh: صَوَمَ → صَامَ (و berharakat, setelah ص berfathah)
 */
const kaidah3WawuYaJadiAlif: KaidahFn = (anatomi, ctx) => {
  let diterapkan = false;
  let logPesan = "";

  // ---------------------------------------------------------
  // KASUS 1: AJWAF (Penyakit di Tengah / 'Ain Fi'il)
  // Contoh: صَوَمَ → صَامَ
  // ---------------------------------------------------------
  if (ctx.bina.startsWith("Ajwaf") && !anatomi.hurufZiyadahTengah) {
    if (anatomi.harakatFa === H.FATHAH && (anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA)) {

      const isMasdarAsli = ctx.shighot === "Masdar";
      const ainHidup = isHarakatHidup(anatomi.harakatAin);

      // Eksekusi jika bukan Masdar yang sukun
      if (!(isMasdarAsli && !ainHidup)) {
        const hurufAsal = anatomi.ainFiil;
        anatomi.ainFiil = H.ALIF;
        anatomi.harakatAin = "";
        diterapkan = true;
        logPesan += `Kaidah 3 (Ajwaf): 'Ain (${hurufAsal}) jatuh setelah Fathah diubah menjadi Alif. `;
      }
    }
  }

  // ---------------------------------------------------------
  // KASUS 2: NAQISH & LAFIF (Penyakit di Akhir / Lam Fi'il)
  // Contoh: دَعَوَ → دَعَا (Wawu), رَمَيَ → رَمَى (Ya)
  // ---------------------------------------------------------
  if (ctx.bina.startsWith("Naqish") || ctx.bina.startsWith("Lafif")) {

    // Syarat: 'Ain berfathah, Lam adalah Wawu/Ya, dan Lam itu hidup (berharakat)
    if (anatomi.harakatAin === H.FATHAH && (anatomi.lamFiil === H.WAWU || anatomi.lamFiil === H.YA)) {

      if (isHarakatHidup(anatomi.harakatLam)) {
        const hurufAsal = anatomi.lamFiil;

        // Jika asalnya Wawu, ubah jadi Alif (ا). Jika Ya, ubah jadi Alif Maqshurah (ى)
        anatomi.lamFiil = hurufAsal === H.WAWU ? H.ALIF : "ى";
        anatomi.harakatLam = ""; // Hilangkan harakatnya karena Alif itu mati

        diterapkan = true;
        logPesan += `Kaidah 3 (Naqish): Lam (${hurufAsal}) berharakat jatuh setelah Fathah diubah menjadi Alif. `;
      }
    }
  }

  return { diterapkan, pesan: logPesan.trim() };
};

/**
 * Kaidah 3b — Wawu/Ya Sukun Setelah Harakat → Madd (Alif/Ya Tanpa Harakat)
 * ─────────────────────────────────────────────────────────────────────────────
 * Setelah Naql (kaidah 4), huruf Wawu/Ya di posisi 'Ain menjadi sukun.
 * Wawu/Ya sukun yang didahului harakat → menjadi huruf madd (Alif/Ya tanpa harakat).
 *
 * Berlaku untuk: Ajwaf pada Mudhari', Isim Maf'ul, dan bentuk lain
 * Contoh: يَصُوْمُ → يَصُومُ (wawu sukun + dhammah sebelumnya = madd dhammah)
 *         مَقُوْلٌ → مَقُولٌ
 *         يَبِيْعُ → يَبِيعُ (ya sukun + kasrah sebelumnya = madd kasrah)
 */
const kaidah3bWawuYaSukunJadiMadd: KaidahFn = (anatomi, ctx) => {
  let diterapkan = false;
  let logPesan = "";

  // KASUS 1: Ajwaf — 'Ain wawu/ya sukun setelah Naql → hapus sukun (madd)
  if (ctx.bina.startsWith("Ajwaf")) {
    const ainWawu = anatomi.ainFiil === H.WAWU && anatomi.harakatAin === H.SUKUN;
    const ainYa   = anatomi.ainFiil === H.YA   && anatomi.harakatAin === H.SUKUN;
    if (ainWawu || ainYa) {
      anatomi.harakatAin = "";
      diterapkan = true;
      logPesan += `Kaidah 3b – Madd: ${anatomi.ainFiil} sukun ('Ain Ajwaf) → madd. `;
    }
  }

  return { diterapkan, pesan: logPesan.trim() };
};

/**
 * Kaidah 3c — Fa' Ya Sukun Mitsal Setelah Kasrah → Madd (untuk مِيعَادٌ)
 * Berjalan SETELAH kaidah10 (yang mengubah Wawu Mitsal sukun → Ya)
 * Contoh: مِوْعَادٌ → kaidah10 → مِيْعَادٌ → kaidah3c → مِيعَادٌ
 */
const kaidah3cMitsalMadd: KaidahFn = (anatomi, ctx) => {
  if (!ctx.bina.startsWith("Mitsal")) return { diterapkan: false, pesan: "" };
  // Fa' harus Ya sukun (sudah dikonversi kaidah10)
  if (anatomi.faFiil !== H.YA || anatomi.harakatFa !== H.SUKUN) return { diterapkan: false, pesan: "" };
  // Harus ada kasrah di prefix (مِ)
  if (!anatomi.hurufZiyadahAwal?.includes(H.KASRAH)) return { diterapkan: false, pesan: "" };
  anatomi.harakatFa = "";
  return {
    diterapkan: true,
    pesan: "Kaidah 3c – Madd: Fa' Ya sukun Mitsal setelah مِ → madd (كسرة+ياء = مد). مِيعَادٌ.",
  };
};

/**
 * Kaidah 4 – Naql (Pindah Harakat dari Illat ke Huruf Shahih Sebelumnya)
 * ─────────────────────────────────────────────────────────────────────────
 * Jika Fa' al-Fi'l bersukun dan 'Ain al-Fi'l adalah Wawu/Ya yang berharakat,
 * pindahkan harakat 'Ain ke Fa', lalu beri Sukun pada 'Ain.
 *
 * Digunakan pada: Isim Fa'il, Maf'ul, Zaman, dll (saat illat di tengah)
 */
const kaidah4Naql: KaidahFn = (anatomi, _ctx) => {
  if (_ctx.bina.startsWith("Lafif Maqrun")) return { diterapkan: false, pesan: "" };
  // Fa' sukun + 'Ain Illat berharakat
  const faSukun = anatomi.harakatFa === H.SUKUN;
  const ainIllat = anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA;
  const ainHidup = isHarakatHidup(anatomi.harakatAin);

  if (!faSukun || !ainIllat || !ainHidup) return { diterapkan: false, pesan: "" };

  const harakatPindah = anatomi.harakatAin;
  const hurufAsal = anatomi.ainFiil;

  // JURUS COMBO: Pindahkan harakat dari 'Ain ke Fa'
  anatomi.harakatFa = harakatPindah;

  let pesanTambahan = "";

  // I'LAL BIN NAQL WAL QALB:
  // Jika harakat yang dipindah adalah FATHAH, huruf illat langsung disulap jadi ALIF.
  // I'LAL BIN NAQL WAL QALB:
  if (harakatPindah === H.FATHAH) {
    anatomi.ainFiil = H.ALIF;
    anatomi.harakatAin = "";
    pesanTambahan = ` 'Ain (${hurufAsal}) langsung diganti menjadi Alif (ا).`;
  } else {
    anatomi.harakatAin = H.SUKUN;

    // 🔴 TAMBAHAN COMBO KESERASIAN (Khusus Ajwaf Ya'i Isim Maf'ul)
    // Jika yang dipindah Dhammah, tapi 'Ain adalah Ya', Dhammah wajib jadi Kasrah! 
    if (harakatPindah === H.DHAMMAH && anatomi.ainFiil === H.YA) {
      anatomi.harakatFa = H.KASRAH;
      pesanTambahan = ` Dhammah dipindah menjadi Kasrah demi keserasian dengan huruf Ya'.`;
    }
  }

  return {
    diterapkan: true,
    pesan: `Kaidah 4 – Naql: Harakat '${harakatPindah}' dari 'Ain al-Fi'l (${hurufAsal}) dipindahkan ke Fa'.${pesanTambahan}`,
  };
};

/**
 * Kaidah 5 – Wawu/Ya Setelah Alif Zaidah → Hamzah
 * ──────────────────────────────────────────────────
 * Jika ada Alif Zaidah (hurufZiyadahTengah = ا) dan 'Ain al-Fi'l
 * adalah Wawu/Ya berkasrah, ubah 'Ain menjadi Hamzah di atas Ya (ئ).
 * Berlaku pada: Isim Fa'il dari Ajwaf/Naqish.
 * Contoh: قَاوِل → قَائِل
 *
 * PENGECUALIAN:
 * - Lafif Maqrun: 'Ain-nya Wawu yang tetap dipertahankan (طَاوٍ, tidak berubah)
 * - Mahmuz 'Ain: Hamzah asli di posisi 'Ain juga berubah jadi ئ (سَاأِل → سَائِل)
 */
const kaidah5WawuYaJadiHamzah: KaidahFn = (anatomi, ctx) => {
  // 🔴 EJAAN HARUS SAMA PERSIS DENGAN WAZAN BUILDER ("Isim Fa'il")
  const SHIGHOT_TARGET = ["Isim Fa'il", "Isim Maf'ul"];
  if (!SHIGHOT_TARGET.includes(ctx.shighot)) return { diterapkan: false, pesan: "" };

  if (anatomi.hurufZiyadahTengah !== H.ALIF) return { diterapkan: false, pesan: "" };

  // 🔴 PENGECUALIAN: Lafif Maqrun — 'Ain Wawu harus tetap Wawu (طَاوٍ bukan طَائٍ)
  if (ctx.bina.startsWith("Lafif Maqrun")) return { diterapkan: false, pesan: "" };

  // Kasus: Wawu/Ya berkasrah → ganti jadi Hamzah di atas Ya (ئ)
  const ainWawuYa = anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA;
  if (ainWawuYa && anatomi.harakatAin === H.KASRAH) {
    const hurufAsal = anatomi.ainFiil;
    anatomi.ainFiil = H.HAMZAH_YA;
    return {
      diterapkan: true,
      pesan: `Kaidah 5 – Qalb: 'Ain al-Fi'l (${hurufAsal}) setelah Alif Zaidah diubah menjadi Hamzah (ئ).`,
    };
  }

  // Kasus tambahan: Mahmuz 'Ain — Hamzah asli di posisi 'Ain juga jadi ئ
  // Contoh: سَاأِلٌ → سَائِلٌ
  const HAMZAH_CHARS = new Set([H.HAMZAH, H.HAMZAH_ATAS, H.HAMZAH_BAWAH, H.HAMZAH_YA, "\u0624"]); // ء أ إ ئ ؤ
  if (HAMZAH_CHARS.has(anatomi.ainFiil) && anatomi.harakatAin === H.KASRAH) {
    anatomi.ainFiil = H.HAMZAH_YA; // ئ
    return {
      diterapkan: true,
      pesan: `Kaidah 5 – Rasm Hamzah: Hamzah ('Ain) berkasrah setelah Alif Zaidah ditulis di atas Ya (ئ).`,
    };
  }

  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah 7 – Buang Harakat Wawu/Ya di Akhir Kata
 * ─────────────────────────────────────────────────
 * Jika Lam al-Fi'l adalah Wawu atau Ya yang berharakat Dhammah/Kasrah,
 * buang harakatnya (beri Sukun) karena dianggap berat di akhir kata.
 */
const kaidah7TakhfifAkhir: KaidahFn = (anatomi, _ctx) => {
  const lamIllat = anatomi.lamFiil === H.WAWU || anatomi.lamFiil === H.YA;
  const harakatBerat = anatomi.harakatLam === H.DHAMMAH || anatomi.harakatLam === H.KASRAH;

  if (!lamIllat || !harakatBerat) return { diterapkan: false, pesan: "" };

  const harakatAsal = anatomi.harakatLam;
  anatomi.harakatLam = ""; // Buang harakat (sukun implicit di akhir kata)

  return {
    diterapkan: true,
    pesan: `Kaidah 7 – Takhfif Akhir: Lam al-Fi'l (${anatomi.lamFiil}) ` +
      `berharakat '${harakatAsal}' di akhir — diringankan dengan ` +
      `membuang harakatnya (sukun implisit).`,
  };
};

/**
 * Kaidah 9 – Buang Wawu Mitsal (Terapit Fathah dan Kasrah)
 * ──────────────────────────────────────────────────────────
 * Khusus bina' Mitsal Wawi pada Fi'il Mudhari'.
 * Jika Fa' al-Fi'l adalah Wawu sukun yang jatuh setelah huruf Mudhara'ah
 * berfathah dan sebelum 'Ain barkasrah → buang Wawu tersebut.
 *
 * Contoh: يَوْعِدُ → يَعِدُ
 * (Fa'=و, harakatFa=sukun, harakatAin=kasrah, mudhara'ah=ي berfathah)
 */
const kaidah9BuangWawuMitsal: KaidahFn = (anatomi, ctx) => {
  // Hanya berlaku untuk bina' Mitsal Wawi
  if (ctx.bina !== "Mitsal Wawi" && ctx.bina !== "Lafif Mafruq") return { diterapkan: false, pesan: "" };
  // Berlaku untuk Mudhari', Nahyi, dan Amr karena semuanya turunan dari mudhari'
  const shighotBerlaku = ["Fi'il Mudhari'", "Fi'il Nahyi", "Fi'il Amr"];
  if (!shighotBerlaku.includes(ctx.shighot)) return { diterapkan: false, pesan: "" };

  // Fa' harus Wawu (pastikan juga ada pengecekan konstanta)
  if (anatomi.faFiil !== H.WAWU) {
    return { diterapkan: false, pesan: "" };
  }

  // 'Ain harus berkasrah (kondisi terapit / turunan bab 2)
  if (anatomi.harakatAin !== H.KASRAH) return { diterapkan: false, pesan: "" };

  // EKSEKUSI: Buang Fa' al-Fi'l (Wawu) beserta harakatnya
  anatomi.faFiil = "";
  anatomi.harakatFa = "";

  let pesanTambahan = "";

  // PENANGANAN KHUSUS AMR:
  // Karena Wawu dibuang, huruf depannya sekarang adalah 'Ain yang berharakat kasrah.
  // Karena sudah bisa dibaca (tidak sukun), maka Hamzah Washol harus dibuang.
  if (ctx.shighot === "Fi'il Amr") {
    anatomi.hurufZiyadahAwal = ""; // Asumsi Hamzah Washol disimpan di sini oleh wazanBuilder
    pesanTambahan = " (Untuk Amr: Hamzah Washol juga dibuang karena huruf awal sudah berharakat).";
  }

  return {
    diterapkan: true,
    pesan: `Kaidah 9 – Hazf Wawu Mitsal: Fa' al-Fi'l (و) dibuang karena jatuh di antara fathah dan kasrah pada asal mudhari'-nya.${pesanTambahan} Contoh: يَوْعِدُ → يَعِدُ.`,
  };
};

/**
 * Kaidah 10 – Wawu Sukun Setelah Kasrah → Ya
 * ────────────────────────────────────────────
 * Jika Fa' al-Fi'l adalah Wawu bersukun dan huruf mudhara'ah berkasrah.
 * Digunakan pada pola Mudhari' tertentu.
 * Contoh: مِوْزَان → مِيزَان
 */
const kaidah10WawuJadiYa: KaidahFn = (anatomi, _ctx) => {
  // 'Ain adalah Wawu sukun dan ada konteks sebelumnya berkasrah
  // Deteksi via: Fa' sukun + Wawu, dan ziyadah awal berkasrah
  if (anatomi.faFiil !== H.WAWU || anatomi.harakatFa !== H.SUKUN) {
    return { diterapkan: false, pesan: "" };
  }

  // Cek apakah ada kasrah sebelum Fa' (dari ziyadah atau mudhara'ah)
  const adaKasrahSebelum = anatomi.hurufZiyadahAwal?.endsWith(H.KASRAH)
    || anatomi.harakatMudhoroah === H.KASRAH;

  if (!adaKasrahSebelum) return { diterapkan: false, pesan: "" };

  anatomi.faFiil = H.YA; // Ganti Wawu → Ya

  return {
    diterapkan: true,
    pesan: `Kaidah 10 – Qalb Wawu→Ya: Wawu sukun (${H.WAWU}) setelah ` +
      `kasrah diubah menjadi Ya (${H.YA}). Contoh: مِوْزَان → مِيزَان.`,
  };
};

/**
 * Kaidah 11 – Idghom Wawu dan Ya (Wawu Sukun + Ya → Ya Tasydid)
 * ───────────────────────────────────────────────────────────────
 * Jika 'Ain al-Fi'l adalah Wawu sukun DAN Lam al-Fi'l adalah Ya,
 * ubah 'Ain menjadi Ya lalu gabungkan (Tasydid) dengan Lam.
 * Contoh: سَيْوِد → سَيِّد
 */
const kaidah11IdghomWawuYa: KaidahFn = (anatomi, _ctx) => {
  if (anatomi.ainFiil !== H.WAWU || anatomi.harakatAin !== H.SUKUN) {
    return { diterapkan: false, pesan: "" };
  }
  if (anatomi.lamFiil !== H.YA) return { diterapkan: false, pesan: "" };

  // Simpan harakat Lam sebelum dimodifikasi
  const harakatLamAsal = anatomi.harakatLam;

  // 'Ain menjadi Ya, harakatnya pindah dari Fa' (Naql terlebih dahulu sudah selesai)
  anatomi.ainFiil = H.YA;
  // Gabungkan dengan Lam via Tasydid: ainFiil = Ya, lamFiil = Tasydid + Ya
  anatomi.harakatAin = H.TASYDID; // Tasydid = idghom Wawu→Ya + Ya Lam
  anatomi.lamFiil = "";         // Lam sudah teridghom ke 'Ain
  anatomi.harakatLam = harakatLamAsal;

  return {
    diterapkan: true,
    pesan: `Kaidah 11 – Idghom Wawu+Ya: Wawu sukun ('Ain) yang berdampingan ` +
      `dengan Ya (Lam) diubah menjadi Ya lalu diidghomkan (tasydid). ` +
      `Contoh: سَيْوِد → سَيِّد.`,
  };
};

/**
 * Kaidah 12 – Wawu di Akhir Setelah Kasrah → Ya
 * ────────────────────────────────────────────────
 * Jika Lam al-Fi'l adalah Wawu dan harakatAin (huruf sebelumnya) adalah kasrah,
 * ubah Lam menjadi Ya.
 * Contoh: القَاضِو → القَاضِي
 */
const kaidah12WawuAkhirJadiYa: KaidahFn = (anatomi, _ctx) => {
  if (anatomi.lamFiil !== H.WAWU) return { diterapkan: false, pesan: "" };
  if (anatomi.harakatAin !== H.KASRAH) return { diterapkan: false, pesan: "" };

  anatomi.lamFiil = H.YA;

  return {
    diterapkan: true,
    pesan: `Kaidah 12 – Qalb Akhir: Wawu (Lam al-Fi'l) di akhir kata ` +
      `setelah kasrah diubah menjadi Ya. Contoh: القَاضِو → القَاضِي.`,
  };
};

/**
 * Kaidah Khusus Isim Manqush (I'lal Hazf pada Isim Fa'il Naqish)
 * ─────────────────────────────────────────────────────────────
 * Jika Isim Fa'il berasal dari bina' Naqish (akhiran Wawu/Ya), maka
 * huruf illat di akhir dibuang karena pertemuan dua huruf mati (Ya' sukun
 * dan Nun Tanwin), lalu harakat 'Ain diganti menjadi Tanwin Kasrah.
 * Contoh: دَاعِيٌ → دَاعٍ
 */
const kaidahIsimManqush: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot === "Isim Fa'il" && (ctx.bina.startsWith("Naqish") || ctx.bina.startsWith("Lafif"))) {

    // Pastikan huruf terakhir adalah Wawu atau Ya
    if (anatomi.lamFiil === H.WAWU || anatomi.lamFiil === H.YA) {
      const hurufAsal = anatomi.lamFiil;

      // 1. Buang Lam Fi'il beserta harakat tanwin dhammah-nya
      anatomi.lamFiil = "";
      anatomi.harakatLam = "";

      // 2. Ganti harakat 'Ain (yang asalnya kasrah) menjadi Tanwin Kasrah (ٍ)
      anatomi.harakatAin = H.TANWIN_KASRAH;

      return {
        diterapkan: true,
        pesan: `Kaidah Isim Manqush: Huruf illat akhir (${hurufAsal}) dibuang karena keberatan tanwin (Iltiqa' Sakinain), dan huruf sebelumnya diberi tanwin kasrah. Contoh: دَاعِيٌ → دَاعٍ.`,
      };
    }
  }
  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah Idghom Isim Maf'ul Naqish (Wawi & Ya'i)
 * ─────────────────────────────────────────────────────────────
 * Khusus untuk Isim Maf'ul dari bina' Naqish.
 * 1. Naqish Wawi: Wawu maf'ul sukun bertemu Wawu lam fi'il -> Idghom Wawu (مَدْعُوٌّ).
 * 2. Naqish Ya'i: Wawu maf'ul sukun bertemu Ya' lam fi'il -> Wawu jadi Ya', lalu Idghom (مَرْمِيٌّ),
 * serta harakat 'Ain yang asalnya Dhammah diganti Kasrah agar serasi.
 */
const kaidahIdghomMafuulNaqish: KaidahFn = (anatomi, ctx) => {
  // Hanya fokus pada Isim Maf'ul dari keluarga Naqish
  if (ctx.shighot !== "Isim Maf'ul" || !(ctx.bina.startsWith("Naqish") || ctx.bina.startsWith("Lafif"))) {
    return { diterapkan: false, pesan: "" };
  }

  // Pastikan ada Wawu Ziyadah Maf'ul-nya
  if (!anatomi.hurufZiyadahSetelahAin?.includes(H.WAWU)) {
    return { diterapkan: false, pesan: "" };
  }

  const harakatLamAsal = anatomi.harakatLam;

  // ----------------------------------------------------------------
  // KASUS 1: NAQISH WAWI (مَدْعُوْوٌ → مَدْعُوٌّ)
  // ----------------------------------------------------------------
  if (anatomi.lamFiil === H.WAWU) {
    anatomi.hurufZiyadahSetelahAin = ""; // Buang Wawu maf'ul (karena lebur)
    anatomi.harakatLam = H.TASYDID + harakatLamAsal; // Beri tasydid pada Wawu akhir
    return {
      diterapkan: true,
      pesan: `Kaidah Idghom Maf'ul Naqish Wawi: Wawu maf'ul diidghomkan ke Lam Fi'il (Wawu). Contoh: مَدْعُوْوٌ → مَدْعُوٌّ.`
    };
  }

  // ----------------------------------------------------------------
  // KASUS 2: NAQISH YA'I (مَرْمُوْيٌ → مَرْمِيٌّ)
  // ----------------------------------------------------------------
  if (anatomi.lamFiil === H.YA) {
    anatomi.hurufZiyadahSetelahAin = ""; // Buang Wawu maf'ul (berubah jadi Ya' dan lebur)
    anatomi.harakatAin = H.KASRAH; // Dhammah diganti Kasrah demi keserasian dengan Ya'
    anatomi.harakatLam = H.TASYDID + harakatLamAsal; // Beri tasydid pada Ya'
    return {
      diterapkan: true,
      pesan: `Kaidah Idghom Maf'ul Naqish Ya'i: Wawu maf'ul diganti Ya' dan diidghomkan. Harakat 'Ain diganti kasrah. Contoh: مَرْمُوْيٌ → مَرْمِيٌّ.`
    };
  }

  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah 13 – Ya Sukun Setelah Dhammah → Wawu
 * ──────────────────────────────────────────────
 * Jika Fa' al-Fi'l adalah Ya bersukun, dan huruf sebelumnya (ziyadah/mudhara'ah)
 * berdhammah, ubah Ya menjadi Wawu.
 * Contoh: مُيْسِر → مُوْسِر
 */
const kaidah13YaJadiWawu: KaidahFn = (anatomi, _ctx) => {
  if (anatomi.faFiil !== H.YA || anatomi.harakatFa !== H.SUKUN) {
    return { diterapkan: false, pesan: "" };
  }

  // Cek dhammah di sebelumnya (dari mudhara'ah atau ziyadah)
  const adaDhammahSebelum = anatomi.harakatMudhoroah === H.DHAMMAH
    || anatomi.hurufZiyadahAwal?.endsWith(H.DHAMMAH);

  if (!adaDhammahSebelum) return { diterapkan: false, pesan: "" };

  anatomi.faFiil = H.WAWU;

  return {
    diterapkan: true,
    pesan: `Kaidah 13 – Qalb Ya→Wawu: Ya sukun setelah dhammah diubah ` +
      `menjadi Wawu. Contoh: مُيْسِر → مُوْسِر.`,
  };
};

/**
 * Kaidah 19 – Masdar Ajwaf Wawi: Wawu antara Kasrah+Alif → Ya
 * ─────────────────────────────────────────────────────────────
 * Khusus Masdar bina' Ajwaf Wawi. Jika 'Ain al-Fi'l adalah Wawu
 * yang diapit kasrah (Fa') dan Alif (Lam/ziyadah), ubah menjadi Ya.
 * Contoh: إِقْوَام → إِقْيَام
 */
const kaidah19MasdarAjwafWawi: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Masdar") return { diterapkan: false, pesan: "" };
  if (ctx.bina !== "Ajwaf Wawi") return { diterapkan: false, pesan: "" };

  // 'Ain = Wawu, harakatFa = kasrah, dan Lam/ziyadahAkhir = Alif
  if (anatomi.ainFiil !== H.WAWU) return { diterapkan: false, pesan: "" };
  if (anatomi.harakatFa !== H.KASRAH) return { diterapkan: false, pesan: "" };
  if (anatomi.lamFiil !== H.ALIF && !anatomi.hurufZiyadahAkhir?.startsWith(H.ALIF)) {
    return { diterapkan: false, pesan: "" };
  }

  anatomi.ainFiil = H.YA; // Ganti Wawu → Ya

  return {
    diterapkan: true,
    pesan: `Kaidah 19 – Masdar Ajwaf Wawi: Wawu ('Ain) yang diapit ` +
      `kasrah (Fa') dan Alif (Lam) diubah menjadi Ya. ` +
      `Contoh: إِقْوَام → إِقْيَام.`,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
//  Implementasi Kaidah 2, 6, 8, 14, 15, 16, 17, 18
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Kaidah 2 – Idghom (Dua Huruf Sama Berurutan → Tasydid)
 * ────────────────────────────────────────────────────────
 * Berlaku on bina' Mudha'af: jika 'Ain = Lam (huruf identik).
 * Harakat 'Ain dipindahkan ke Fa' (jika Fa' sukun), lalu 'Ain disukunkan
 * dan Lam mendapat Tasydid menggantikan 'Ain yang sudah lebur.
 * Contoh: رَدَدَ → رَدَّ  (ردد: Fa'=ر, Ain=د, Lam=د)
 */
const kaidah2Idghom: KaidahFn = (anatomi, ctx) => {
  if (ctx.bina !== "Mudha'af") return { diterapkan: false, pesan: "" };

  // Syarat 1: 'Ain dan Lam hurufnya sama
  if (anatomi.ainFiil !== anatomi.lamFiil) return { diterapkan: false, pesan: "" };

  // 🔴 SYARAT 2 (PELINDUNG): Tidak boleh ada tembok pemisah antara 'Ain dan Lam!
  // Jika ada huruf Ziyadah di antara mereka (seperti Wawu pada Isim Maf'ul مَمْدُوْدٌ), Idghom BATAL!
  if (anatomi.hurufZiyadahSetelahAin) {
    return { diterapkan: false, pesan: "" };
  }

  // Simpan harakat 'Ain asli SEBELUM Naql otomatis
  const harakatAinAsal = anatomi.harakatAin;
  const harakatLamAsal = anatomi.harakatLam;

  // Jika Fa' sukun, pindahkan harakat 'Ain ke Fa' (Naql otomatis)
  // Catatan: setelah ini, harakatAin diganti sukun oleh bagian bawah
  if (anatomi.harakatFa === H.SUKUN && isHarakatHidup(anatomi.harakatAin)) {
    anatomi.harakatFa = anatomi.harakatAin;
  }

  // Idghom: urutan Unicode yang benar = huruf + harakat + tasydid
  // Harakat sebelum tasydid = harakatLAM (harakat akhir kata), bukan harakatAin
  // مَدَّ: harakatLam=fathah → دَّ ✅
  // يَمُدُّ: harakatLam=dhammah → دُّ ✅
  // مَادٌّ: harakatLam=tanwinDhammah → دٌّ ✅ (isim fa'il mudha'af)
  const harakatPra = isHarakatHidup(harakatLamAsal) ? harakatLamAsal : "";
  anatomi.harakatAin = harakatPra + H.TASYDID;
  anatomi.lamFiil = "";           // Lam lebur ke 'Ain
  // harakatLam dikosongkan: harakat akhir sudah dimasukkan ke harakatAin
  // (menghindari render ganda: ain + (harakatLam+tasydid) + harakatLam)
  anatomi.harakatLam = "";
  if (ctx.shighot === "Fi'il Amr" || ctx.shighot === "Fi'il Nahyi") {
    // Amr Mudha'af: مُدَّ / Nahyi: لَا تَمُدَّ
    // Keduanya berakhiran FATHAH + TASYDID (harakat akhir = fathah pada tasydid)
    if (ctx.shighot === "Fi'il Amr") anatomi.hurufZiyadahAwal = "";
    anatomi.harakatAin = H.FATHAH + H.TASYDID;
    anatomi.harakatLam = ""; // Harakat sudah termasuk di harakatAin
  }

  return {
    diterapkan: true,
    pesan: `Kaidah 2 – Idghom: Dua huruf sama ('Ain dan Lam = ${anatomi.ainFiil}) digabungkan dengan Tasydid.`,
  };
};

/**
 * Kaidah 6 – Hazf (Illat Mati Bertemu Shahih Mati → Buang Illat)
 * ────────────────────────────────────────────────────────────────
 * Jika Lam al-Fi'l adalah huruf illat bersukun DAN ada tambahan sufiks
 * yang menyebabkan pertemuan dua huruf mati (misal: pada jama' atau tasrif),
 * huruf illat tersebut dibuang.
 *
 * Dalam konteks Anatomi: berlaku saat harakatLam = Sukun dan lamFiil = و/ي
 * pada shighot yang sudah mempunyai harakatLam sukun (seperti Amr/Nahyi).
 * Contoh: اُدْعُوْ + ن (Jama') → اُدْعُوْا / اُدْعُنَ (wawu dibuang)
 */
const kaidah6HazfIllatMati: KaidahFn = (anatomi, ctx) => {
  let diterapkan = false;
  let logPesan = "";

  // KASUS 1: NAQISH & LAFIF
  // AMR dan NAHYI: Lam illat di akhir dibuang (Iltiqa' Sakinain)
  const isNaqishAtauLafif = ctx.bina.startsWith("Naqish") || ctx.bina.startsWith("Lafif");
  if (isNaqishAtauLafif && ["Fi'il Amr", "Fi'il Nahyi"].includes(ctx.shighot)) {
    const lamIllat = anatomi.lamFiil === H.WAWU || anatomi.lamFiil === H.YA;
    // Juga buang Alif Maqshurah (ى) yang merupakan hasil Kaidah 3
    const lamAlifMaq = anatomi.lamFiil === "\u0649" || anatomi.lamFiil === H.ALIF;
    if (lamIllat || lamAlifMaq) {
      anatomi.lamFiil = "";
      anatomi.harakatLam = "";
      diterapkan = true;
      logPesan += `Kaidah 6 – Hazf Naqish/Lafif: Huruf illat akhir (${lamIllat ? "و/ي" : "ى"}) dibuang. `;
    }
  }

  // KASUS 2: AJWAF ISIM MAF'UL (Sapu Jagat)
  if (ctx.bina.startsWith("Ajwaf") && ctx.shighot === "Isim Maf'ul") {
    // Geledah kamar 1: Ziyadah Setelah 'Ain
    if (anatomi.hurufZiyadahSetelahAin?.includes(H.WAWU)) {
      anatomi.hurufZiyadahSetelahAin = "";
      diterapkan = true;
      logPesan += `Kaidah 6 – Hazf Ajwaf: Wawu maf'ul dibuang. `;
    }
    // Geledah kamar 2: Ziyadah Akhir (Jika wazanBuilder masih pakai versi lama)
    else if (anatomi.hurufZiyadahAkhir?.includes(H.WAWU + H.SUKUN)) {
      anatomi.hurufZiyadahAkhir = anatomi.hurufZiyadahAkhir.replace(H.WAWU + H.SUKUN, "");
      diterapkan = true;
      logPesan += `Kaidah 6 – Hazf Ajwaf: Wawu maf'ul dibuang dari Ziyadah Akhir. `;
    }
  }

  // KASUS 3: AJWAF AMR & NAHYI
  if (ctx.bina.startsWith("Ajwaf") && ["Fi'il Amr", "Fi'il Nahyi"].includes(ctx.shighot)) {
    if ((anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA || anatomi.ainFiil === H.ALIF) && (!anatomi.harakatAin || anatomi.harakatAin === H.SUKUN)) {
      anatomi.ainFiil = "";
      anatomi.harakatAin = "";
      diterapkan = true;
      logPesan += `Kaidah 6 – Hazf Ajwaf: Huruf illat dibuang. `;

      if (ctx.shighot === "Fi'il Amr") {
        anatomi.hurufZiyadahAwal = "";
        logPesan += `Hamzah Washol juga dibuang.`;
      }
    }
  }

  return { diterapkan, pesan: diterapkan ? logPesan.trim() : "" };
};
/**
 * Kaidah 8 – Dua Hamzah Berurutan (Kedua Sukun → Mad)
 * ──────────────────────────────────────────────────────
 * Berlaku pada bina' Mahmuz Fa': jika Fa' al-Fi'l adalah Hamzah DAN
 * ada Hamzah lain sebelumnya (dari huruf mudhara'ah أ pada Mufrad Mutakallim),
 * Hamzah kedua (Fa' yang sukun) diganti huruf Mad sesuai harakat Hamzah pertama:
 *   - Fathah → Alif (ا)
 *   - Kasrah → Ya   (ي)
 *   - Dhammah → Wawu (و)
 * Contoh: أَأْمَنَ → آمَنَ
 */
const kaidah8DuaHamzah: KaidahFn = (anatomi, ctx) => {
  if (!ctx.bina.startsWith("Mahmuz Fa'")) return { diterapkan: false, pesan: "" };

  // KASUS 1: Dua Hamzah di awal (Contoh: أَأْمَنَ -> آمَنَ)
  if (anatomi.hurufMudhoroah === H.HAMZAH_ATAS && anatomi.harakatFa === H.SUKUN) {
    anatomi.faFiil = H.ALIF; // Fathah -> Alif
    anatomi.harakatFa = "";
    return { diterapkan: true, pesan: "Kaidah 8: Dua Hamzah bertemu, Hamzah kedua jadi Mad." };
  }

  // KASUS 2: Hamzah Fathah bertemu Alif Zaidah pada Isim Fa'il (أَامِلٌ -> آمِلٌ)
  if (anatomi.harakatFa === H.FATHAH && anatomi.hurufZiyadahTengah === H.ALIF) {
    anatomi.faFiil = "\u0622"; // Unicode untuk Alif Maddah (آ)
    anatomi.harakatFa = "";
    anatomi.hurufZiyadahTengah = ""; // Alif-nya lebur ke dalam Maddah
    return { diterapkan: true, pesan: "Kaidah 8: Hamzah fathah bertemu Alif zaidah digabung jadi Alif Maddah (آ)." };
  }

  return { diterapkan: false, pesan: "" };
};

/**
 * Kaidah 14 – 'Ain Ganda pada Wazan Taf'iil (Mudha'af)
 * ──────────────────────────────────────────────────────
 * Khusus Masdar bina' Mudha'af pada wazan فَعَّلَ (Bab Mazid).
 * Jika sudah ada Tasydid (tanda idghom) pada 'Ain, maka kaidah ini
 * bersifat deskriptif: menginformasikan bahwa pengulangan huruf 'Ain
 * dalam wazan ini sudah benar dan tidak memerlukan perubahan lebih lanjut.
 */
const kaidah14TafIil: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Masdar") return { diterapkan: false, pesan: "" };
  if (ctx.bina !== "Mudha'af") return { diterapkan: false, pesan: "" };

  // Jika sudah ada Tasydid pada 'Ain (tanda sudah diidghom di kaidah 2)
  if (anatomi.harakatAin !== H.TASYDID) return { diterapkan: false, pesan: "" };

  return {
    diterapkan: true,
    pesan: `Kaidah 14 – Taf'iil: Pada Masdar bina' Mudha'af, huruf 'Ain diulang ` +
      `dengan Tasydid (ّ) sesuai wazan فَعَّل. Bentuk ini sudah benar.`,
  };
};

/**
 * Kaidah 15 – Wawu di Posisi ke-4+ (Bukan Setelah Dhammah) → Ya
 * ────────────────────────────────────────────────────────────────
 * Berlaku pada bina' Naqish Wawi. Jika Lam al-Fi'l adalah Wawu
 * dan berada di posisi keempat atau lebih dalam kata (dihitung dari awal),
 * DAN huruf 'Ain sebelumnya BUKAN berdhammah — ganti Wawu menjadi Ya.
 * Contoh: مَغْزُو (wawu di posisi ke-4, ain berdhammah → tidak berlaku)
 *         مَسَاوِي (wawu ke-5, ain berkasrah → berlaku)
 */
const kaidah15WawuJadiYaPosisi4: KaidahFn = (anatomi, ctx) => {
  if (!ctx.bina.startsWith("Naqish Wawi")) return { diterapkan: false, pesan: "" };

  // Lam harus Wawu
  if (anatomi.lamFiil !== H.WAWU) return { diterapkan: false, pesan: "" };

  // Hitung posisi (minimal): ziyadahAwal + mudhara'ah + fa + ziyadahTengah + ain + lam
  const panjangAwal = (anatomi.hurufZiyadahAwal?.replace(/[\u064B-\u065F]/g, "").length ?? 0)
    + (anatomi.hurufMudhoroah ? 1 : 0)
    + (anatomi.faFiil ? 1 : 0)
    + (anatomi.hurufZiyadahTengah?.replace(/[\u064B-\u065F]/g, "").length ?? 0)
    + (anatomi.ainFiil ? 1 : 0);

  // Lam berada di posisi ke-(panjangAwal+1)
  if (panjangAwal + 1 < 4) return { diterapkan: false, pesan: "" };

  // Jika 'Ain berdhammah → kaidah tidak berlaku (wawu setelah dhammah tetap wawu)
  if (anatomi.harakatAin === H.DHAMMAH) return { diterapkan: false, pesan: "" };

  anatomi.lamFiil = H.YA; // Ganti Wawu → Ya

  return {
    diterapkan: true,
    pesan: `Kaidah 15 – Qalb Posisi ke-${panjangAwal + 1}: Wawu (Lam al-Fi'l) ` +
      `yang berada di posisi ke-${panjangAwal + 1} dan tidak didahului Dhammah ` +
      `diganti menjadi Ya.`,
  };
};



/**
 * Kaidah 16 – Masdar Ajwaf af'ala/istaf'ala → Alif Dibuang + Ta' Marbuthah
 * ────────────────────────────────────────────────────────────────────────────
 * Berlaku pada Masdar bina' Ajwaf yang sudah terkena Kaidah 3 (ain jadi Alif).
 * Pada level Tsulatsi: jika setelah Kaidah 3 diterapkan 'Ain = Alif,
 * dan ada harakatLam yang menyebabkan posisi akhir tidak stabil,
 * Alif ('Ain) dibuang dan Lam diganti Ta' Marbuthah.
 * Contoh: إِقَامَة ← إِقْوَامَة (Ajwaf Wawi)
 */
const kaidah16MasdarAjwafTaMarbuthah: KaidahFn = (anatomi, ctx) => {
  if (ctx.shighot !== "Masdar") return { diterapkan: false, pesan: "" };
  if (!ctx.bina.startsWith("Ajwaf")) return { diterapkan: false, pesan: "" };

  // 'Ain harus sudah jadi Alif (hasil kaidah 3)
  if (anatomi.ainFiil !== H.ALIF) return { diterapkan: false, pesan: "" };

  // Jika huruf ziyadahAkhir atau lamFiil mengindikasikan masdar sudah berakhiran ة
  if (anatomi.hurufZiyadahAkhir?.includes(H.TA_MARBUTHAH)) {
    return { diterapkan: false, pesan: "" }; // sudah diproses
  }

  // Buang Alif ('Ain), ganti Lam dengan Ta' Marbuthah
  const lamAsal = anatomi.lamFiil;
  anatomi.ainFiil = ""; // Alif dibuang
  anatomi.harakatAin = "";
  // Lam diganti Ta' Marbuthah
  anatomi.lamFiil = H.TA_MARBUTHAH;
  anatomi.harakatLam = "";

  return {
    diterapkan: true,
    pesan: `Kaidah 16 – Masdar Ajwaf: Alif ('Ain) dibuang dan Lam (${lamAsal}) ` +
      `diganti Ta' Marbuthah (ة). Contoh: إِقْوَام → إِقَامَة.`,
  };
};

/**
 * Kaidah 17 – Dhammah Sebelum Ya Akhir Isim → Kasrah
 * ─────────────────────────────────────────────────────
 * Berlaku pada Isim (Fa'il, Maf'ul, Zaman/Makan, Alat) yang berakhiran Ya.
 * Jika 'Ain al-Fi'l berdhammah dan Lam al-Fi'l adalah Ya, ubah
 * harakatAin menjadi Kasrah agar harmonis dengan Ya di akhir.
 * Contoh: قَاضُي → قَاضِي
 */
const kaidah17DhammahJadiKasrahSebelumYa: KaidahFn = (anatomi, ctx) => {
  const SHIGHOT_ISIM = ["Isim Fa'il", "Isim Maf'ul", "Isim Zaman/Makan", "Isim Alat"];
  if (!SHIGHOT_ISIM.includes(ctx.shighot)) return { diterapkan: false, pesan: "" };

  // Lam harus Ya
  if (anatomi.lamFiil !== H.YA) return { diterapkan: false, pesan: "" };

  // 'Ain harus berdhammah
  if (anatomi.harakatAin !== H.DHAMMAH) return { diterapkan: false, pesan: "" };

  anatomi.harakatAin = H.KASRAH; // Ganti Dhammah → Kasrah

  return {
    diterapkan: true,
    pesan: `Kaidah 17 – Tashil: Dhammah ('Ain) sebelum Ya (Lam) ` +
      `di akhir isim diganti Kasrah agar harmonis. ` +
      `Contoh: قَاضُي → قَاضِي.`,
  };
};

/**
 * Kaidah 18 – Wazan Ifta'ala: Fa' Wawu/Ya → Ta' + Idghom dengan Ta' Ifta'ala
 * ─────────────────────────────────────────────────────────────────────────────
 * Berlaku pada bina' Mitsal (Wawi/Ya'i) yang dipakai pada wazan اِفْتَعَلَ.
 * Fa' al-Fi'l yang berupa Wawu/Ya diganti Ta', lalu diidghomkan dengan
 * Ta' ifta'ala (yang merupakan huruf Zaidah isytiqaq bab ini).
 *
 * Deteksi wazan Ifta'ala: hurufZiyadahAwal dimulai dengan اِفْ atau اُفْ
 * (Hamzah Washal + Fa' Sukun). Dalam konteks Tsulatsi dasar ini hanya
 * berlaku jika shighot adalah Masdar dan ada tanda khusus.
 * Contoh: اِوْتَقَدَ → اِتَّقَدَ
 */
const kaidah18IftaalaFaJadiTa: KaidahFn = (anatomi, ctx) => {
  const BINA_TARGET = ["Mitsal Wawi", "Mitsal Ya'i"];
  if (!BINA_TARGET.includes(ctx.bina)) return { diterapkan: false, pesan: "" };

  // Hanya berlaku jika ada ziyadah awal berupa Hamzah Washal (tanda wazan Ifta'ala)
  // Dalam wazanBuilder Tsulatsi, Ifta'ala tidak di-generate secara default.
  // Kaidah ini bersifat AKTIF hanya jika hurufZiyadahAwal mengandung ta' (ت)
  const adaTaZiyadah = anatomi.hurufZiyadahAwal?.includes("\u062A"); // ت
  if (!adaTaZiyadah) return { diterapkan: false, pesan: "" };

  // Fa' harus Wawu atau Ya
  if (anatomi.faFiil !== H.WAWU && anatomi.faFiil !== H.YA) {
    return { diterapkan: false, pesan: "" };
  }

  const hurufAsal = anatomi.faFiil;

  // Ganti Fa' menjadi Ta', lalu Tasydid dengan Ta' yang sudah ada di ziyadah
  // Efek: faFiil = ت + Tasydid (idghom dengan Ta' ifta'ala)
  anatomi.faFiil = "\u062A" + H.TASYDID; // تّ
  anatomi.harakatFa = anatomi.harakatFa;     // harakat tetap

  return {
    diterapkan: true,
    pesan: `Kaidah 18 – Ifta'ala: Fa' al-Fi'l (${hurufAsal}) pada wazan اِفْتَعَلَ ` +
      `diganti menjadi Ta' (ت) lalu diidghomkan dengan Ta' ifta'ala → تّ. ` +
      `Contoh: اِوْتَقَدَ → اِتَّقَدَ.`,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
//  Pipeline Eksekusi (Urutan Sangat Penting!)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * PIPELINE — Array kaidah yang dieksekusi secara berurutan.
 * Setiap kaidah memodifikasi anatomi secara mutative dan melaporkan hasilnya.
 * Kaidah yang belum diimplementasi diberi stub TODO (tidak mengubah apapun).
 */
const PIPELINE: KaidahFn[] = [
  kaidah8DuaHamzah,                    // Dua Hamzah (paling awal)
  kaidahSimaiMahmuzAmr,                // Sima'i: أمر/أكل/أخذ → مُرْ/كُلْ/خُذْ
  kaidah1HamzahWashal,                 // Hamzah Washal Amr
  kaidahMahmuzFaAmrRasmHamzah,         // Mahmuz Fa' Amr: اُؤْمُرْ / اِئْسِرْ
  kaidah2Idghom,                       // Idghom Mudha'af
  kaidah3WawuYaJadiAlif,               // Wawu/Ya → Alif (setelah Fathah)
  kaidah4Naql,                         // Pindah harakat + sukunkan illat
  kaidah3bWawuYaSukunJadiMadd,         // Wawu/Ya sukun Ajwaf → Madd (hapus sukun eksplisit)
  kaidah5WawuYaJadiHamzah,             // Wawu/Ya → Hamzah (setelah Alif Zaidah)
  kaidah9BuangWawuMitsal,              // Buang Wawu Mitsal (antara fathah+kasrah)
  kaidah10WawuJadiYa,                  // Wawu sukun setelah kasrah → Ya
  kaidah3cMitsalMadd,                  // Fa' Ya sukun Mitsal setelah kasrah → Madd (مِيعَادٌ)
  kaidah11IdghomWawuYa,                // Wawu+Ya → YaYa Tasydid
  kaidah12WawuAkhirJadiYa,             // Wawu akhir setelah kasrah → Ya
  kaidah13YaJadiWawu,                  // Ya sukun setelah dhammah → Wawu
  kaidah6HazfIllatMati,                // Hazf illat mati (Naqish Amr/Nahyi)
  kaidah7TakhfifAkhir,                 // Buang harakat wawu/ya di akhir
  kaidah14TafIil,                      // Taf'iil Mudha'af (deskriptif)
  kaidah15WawuJadiYaPosisi4,           // Wawu posisi ke-4+
  kaidah16MasdarAjwafTaMarbuthah,      // Masdar Ajwaf → Ta' Marbuthah
  kaidah17DhammahJadiKasrahSebelumYa,  // Dhammah sebelum Ya akhir → Kasrah
  kaidah18IftaalaFaJadiTa,             // Ifta'ala: Fa' Wawu/Ya → Ta' Idghom
  kaidah19MasdarAjwafWawi,             // Masdar Ajwaf Wawi: Wawu → Ya
  kaidahIsimManqush,
  kaidahIdghomMafuulNaqish,
  kaidahRasmHamzah,                    // Rasm Hamzah (paling akhir, setelah semua)
];

// ══════════════════════════════════════════════════════════════════════════════
//  Kaidah Rasm Hamzah
// ══════════════════════════════════════════════════════════════════════════════

// Deklarasi forward-reference agar PIPELINE bisa mereferensi sebelum definisi:
// (Karena PIPELINE const ada DI ATAS, kita perlu pindah definisi RasmHamzah ke sebelum PIPELINE)
// Solusi: definisikan sebagai function biasa (hoisted)
function kaidahRasmHamzah(anatomi: AnatomiKata, _ctx: WordContext): { diterapkan: boolean; pesan: string } {
  const HAMZAH_ASLI = new Set([H.HAMZAH, H.HAMZAH_ATAS, H.HAMZAH_BAWAH, "\u0624"]); // ء أ إ ؤ
  let diterapkan = false;
  let logPesan = "";

  // [A] Hamzah di posisi 'Ain — Isim Maf'ul Mahmuz 'Ain
  // Contoh: مَسْأُول → مَسْؤُول
  if (HAMZAH_ASLI.has(anatomi.ainFiil)) {
    // Jika ada wawu madd setelah 'Ain (pada Isim Maf'ul konteks مَفْعُول):
    // hamzah ditulis sebagai ء (hamzah bebas), BUKAN ؤ
    // Contoh: مَقْرُوءٌ (madzhab: qaraaa) — bukan مَقْرُوؤٌ
    if (anatomi.hurufZiyadahSetelahAin) {
      // Hamzah sebelum wawu madd = ditulis di atas wawu ؤ HANYA jika harakat'Ain = dhammah
      // Jika harakat'Ain = dhammah, maka ؤ. Jika ada wawu setelah: tetap ء
      // (tergantung madzhab; ikut yang umum: jika diikuti wawu = diperantarai wawu = ؤ bukan ء)
      anatomi.ainFiil = "\u0624"; // ؤ
      diterapkan = true;
      logPesan += "Rasm Hamzah: Hamzah 'Ain sebelum Wawu Madd ditulis di atas Wawu (ؤ). ";
    } else if (anatomi.harakatAin === H.DHAMMAH) {
      anatomi.ainFiil = "\u0624"; // ؤ
      diterapkan = true;
      logPesan += "Rasm Hamzah: Hamzah 'Ain berdhammah ditulis di atas Wawu (ؤ). ";
    }
  }

  // [B] Hamzah di posisi Lam — Isim Fa'il / Maf'ul Mahmuz Lam
  // Contoh: قَارِأٌ → قَارِئٌ / مَقْرُوءٌ (setelah wawu madd → ء)
  if (HAMZAH_ASLI.has(anatomi.lamFiil) || anatomi.lamFiil === H.HAMZAH) {
    // Jika ada wawu madd setelah 'Ain (hurufZiyadahSetelahAin) = مَقْرُوءٌ
    // Sebelum Lam ada huruf madd (و) yang sakin → hamzah ditulis ء (di garis)
    if (anatomi.hurufZiyadahSetelahAin) {
      anatomi.lamFiil = H.HAMZAH; // ء (bebas, di atas garis)
      diterapkan = true;
      logPesan += "Rasm Hamzah: Hamzah Lam setelah wawu madd ditulis ء (di garis). ";
    } else if (anatomi.harakatAin === H.KASRAH) {
      anatomi.lamFiil = H.HAMZAH_YA; // ئ
      diterapkan = true;
      logPesan += "Rasm Hamzah: Hamzah Lam setelah kasrah ditulis di atas Ya (ئ). ";
    } else if (anatomi.harakatAin === H.DHAMMAH) {
      anatomi.lamFiil = "\u0624"; // ؤ
      diterapkan = true;
      logPesan += "Rasm Hamzah: Hamzah Lam setelah dhammah ditulis di atas Wawu (ؤ). ";
    }
  }

  return { diterapkan, pesan: diterapkan ? logPesan.trim() : "" };
}

// ══════════════════════════════════════════════════════════════════════════════
//  Fungsi Utama: prosesIlal
// ══════════════════════════════════════════════════════════════════════════════

/**
 * prosesIlal — Menjalankan anatomi kata melalui pipeline 19 kaidah I'lal.
 *
 * Pendekatan:
 * 1. Clone anatomiAwal (agar tidak memutasi input asli)
 * 2. Untuk setiap kaidah, panggil fungsinya; jika diterapkan: catat pesan
 * 3. Render anatomi akhir menjadi string
 * 4. Jika log kosong: tambahkan fallback "tidak ada kaidah i'lal yg berlaku"
 *
 * @param anatomiAwal - AnatomiKata dari wazanBuilder (tidak akan dimutasi)
 * @param context     - WordContext: bina, bab, shighot, akarKata
 * @returns ProsesIlal dengan hasilAkhir dan logProses
 */
export function prosesIlal(anatomiAwal: AnatomiKata, context: WordContext): ProsesIlal {
  // Shahih Salim → langsung return tanpa proses
  if (context.bina === "Shahih Salim") {
    return {
      asalKata: renderAnatomiToString(anatomiAwal),
      hasilAkhir: renderAnatomiToString(anatomiAwal),
      logProses: ["Tidak ada kaidah i'lal yang berlaku karena bina' Shahih Salim."],
      bina: context.bina,
    };
  }

  // Clone anatomi agar tidak mengganggu data asli dari wazanBuilder
  const anatomi: AnatomiKata = { ...anatomiAwal };
  const logProses: string[] = [];
  const kataAwal = renderAnatomiToString(anatomiAwal);

  // Jalankan seluruh pipeline
  for (const kaidah of PIPELINE) {
    const hasil = kaidah(anatomi, context);
    if (hasil.diterapkan && hasil.pesan) {
      logProses.push(hasil.pesan);
    }
  }

  // Fallback wajib: jika tidak ada kaidah yang berlaku
  if (logProses.length === 0) {
    logProses.push("tidak ada kaidah i'lal yg berlaku");
  }

  return {
    asalKata: kataAwal,
    hasilAkhir: renderAnatomiToString(anatomi),
    logProses,
    bina: context.bina,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  Backward Compat: analisisIlal (wrapper untuk /api/search & /api/analyze)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * analisisIlal — Wrapper kompatibilitas untuk API lama yang menerima string.
 * Digunakan oleh /api/search dan /api/analyze yang belum dialihkan ke anatomi.
 */
export function analisisIlal(
  kataInput: string,
  rootWord: string,
  bina: string,
  shighot: string
): ProsesIlal {
  // Pendekatan fallback: gunakan regex engine lama (string-based)
  // karena API ini tidak punya informasi bab
  const log: string[] = [];
  let hasil = kataInput;

  if (bina === "Shahih Salim") {
    return { asalKata: kataInput, hasilAkhir: kataInput, logProses: ["tidak ada kaidah i'lal yg berlaku"], bina };
  }

  // Kaidah 3 (string fallback)
  const re3 = /([^\u064B-\u065F])\u064E([وي])[\u064E\u064F\u0650\u064B\u064C\u064D]/g;
  if (re3.test(hasil)) {
    hasil = hasil.replace(/([^\u064B-\u065F])\u064E([وي])[\u064E\u064F\u0650\u064B\u064C\u064D]/g, "$1\u064E\u0627");
    log.push("Kaidah 3 – Wawu/Ya berharakat setelah Fathah diganti menjadi Alif (ا).");
  }

  // Kaidah 9 (string fallback)
  const re9 = /([\u064A\u062A\u0646\u0623])\u064E\u0648\u0652?([\u0621-\u064A])\u0650/g;
  if (re9.test(hasil)) {
    hasil = hasil.replace(/([\u064A\u062A\u0646\u0623])\u064E\u0648\u0652?([\u0621-\u064A])\u0650/g, "$1\u064E$2\u0650");
    log.push("Kaidah 9 – Wawu Mitsal dibuang karena terapit fathah dan kasrah.");
  }

  if (log.length === 0) log.push("tidak ada kaidah i'lal yg berlaku");

  return { asalKata: kataInput, hasilAkhir: hasil, logProses: log, bina };
}

/**
 * prosesTasrifDanIlal — Legacy wrapper untuk /api/analyze.
 */
export function prosesTasrifDanIlal(kata: string, akarKata: string): ProsesIlal {
  const bina = deteksiBina(akarKata);
  return analisisIlal(kata, akarKata, bina, "Fi'il Madhi");
}
