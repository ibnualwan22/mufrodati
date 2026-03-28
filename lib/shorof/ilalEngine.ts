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
const isHarakatHidup = (h: string) => (
  [H.FATHAH as string, H.DHAMMAH as string, H.KASRAH as string].includes(h)
);

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
  if (!ctx.bina.startsWith("Ajwaf")) return { diterapkan: false, pesan: "" };

  // Pelindung untuk Isim Fa'il (Ziyadah Alif di tengah)
  if (anatomi.hurufZiyadahTengah) return { diterapkan: false, pesan: "" };

  const faFatah = anatomi.harakatFa === H.FATHAH;
  const ainIllat = anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA;

  if (!faFatah || !ainIllat) return { diterapkan: false, pesan: "" };

  // PENYESUAIAN LOGIKA:
  // 'Ain harus hidup, ATAU 'Ain sukun karena baru saja kena Naql (seperti Masdar Mim/Zaman).
  // Masdar asli (صَوْمًا) aslinya memang sukun, jadi kita kecualikan agar tidak ikut berubah jadi صَامًا.
  const isMasdarAsli = ctx.shighot === "Masdar";
  const ainHidup = isHarakatHidup(anatomi.harakatAin);

  if (isMasdarAsli && !ainHidup) return { diterapkan: false, pesan: "" };

  const hurufAsal = anatomi.ainFiil;
  anatomi.ainFiil = H.ALIF;
  anatomi.harakatAin = "";

  return {
    diterapkan: true,
    pesan: `Kaidah 3 – Qalb: 'Ain al-Fi'l (${hurufAsal}) jatuh setelah Fathah diubah menjadi Alif.`,
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
  // Fa' sukun + 'Ain Illat berharakat
  const faSukun = anatomi.harakatFa === H.SUKUN;
  const ainIllat = anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA;
  const ainHidup = isHarakatHidup(anatomi.harakatAin);

  if (!faSukun || !ainIllat || !ainHidup) return { diterapkan: false, pesan: "" };

  const harakatPindah = anatomi.harakatAin;

  // Pindahkan harakat dari 'Ain ke Fa'
  anatomi.harakatFa = harakatPindah;
  anatomi.harakatAin = H.SUKUN; // 'Ain sekarang sukun

  return {
    diterapkan: true,
    pesan: `Kaidah 4 – Naql: Harakat '${harakatPindah}' dari 'Ain al-Fi'l ` +
      `(${anatomi.ainFiil}) dipindahkan ke Fa' al-Fi'l yang sebelumnya sukun. ` +
      `'Ain menjadi sukun.`,
  };
};

/**
 * Kaidah 5 – Wawu/Ya Setelah Alif Zaidah → Hamzah
 * ──────────────────────────────────────────────────
 * Jika ada Alif Zaidah (hurufZiyadahTengah = ا) dan 'Ain al-Fi'l
 * adalah Wawu/Ya berkasrah, ubah 'Ain menjadi Hamzah di atas Ya (ئ).
 * Berlaku pada: Isim Fa'il dari Ajwaf/Naqish.
 * Contoh: قَاوِل → قَائِل
 */
const kaidah5WawuYaJadiHamzah: KaidahFn = (anatomi, ctx) => {
  // 🔴 EJAAN HARUS SAMA PERSIS DENGAN WAZAN BUILDER ("Isim Fa'il")
  const SHIGHOT_TARGET = ["Isim Fa'il", "Isim Maf'ul"];
  if (!SHIGHOT_TARGET.includes(ctx.shighot)) return { diterapkan: false, pesan: "" };

  if (anatomi.hurufZiyadahTengah !== H.ALIF) return { diterapkan: false, pesan: "" };

  const ainIllat = anatomi.ainFiil === H.WAWU || anatomi.ainFiil === H.YA;
  if (!ainIllat || anatomi.harakatAin !== H.KASRAH) return { diterapkan: false, pesan: "" };

  const hurufAsal = anatomi.ainFiil;
  anatomi.ainFiil = H.HAMZAH_YA;

  return {
    diterapkan: true,
    pesan: `Kaidah 5 – Qalb: 'Ain al-Fi'l (${hurufAsal}) setelah Alif Zaidah diubah menjadi Hamzah (ئ).`,
  };
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
  if (ctx.bina !== "Mitsal Wawi") return { diterapkan: false, pesan: "" };

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

  // Syarat: 'Ain dan Lam hurufnya sama
  if (anatomi.ainFiil !== anatomi.lamFiil) return { diterapkan: false, pesan: "" };

  // Simpan harakat Lam sebelum dimodifikasi
  const harakatLamAsal = anatomi.harakatLam;

  // Jika Fa' sukun, pindahkan harakat 'Ain ke Fa' (Naql otomatis)
  if (anatomi.harakatFa === H.SUKUN && isHarakatHidup(anatomi.harakatAin)) {
    anatomi.harakatFa = anatomi.harakatAin; // pindah harakat ke Fa'
  }

  // 'Ain disukunkan lalu lebur ke Lam (efek: Lam mendapat Tasydid)
  anatomi.harakatAin = H.SUKUN;    // sukunkan 'Ain (sebagai proses idghom)
  // Representasi idghom: harakatAin jadi tasydid, lamFiil tetap, harakatLam dipertahankan
  anatomi.harakatAin = H.TASYDID;  // Tasydid pada huruf yang diidghom
  anatomi.lamFiil = "";          // Lam lebur ke 'Ain (tasydid)
  anatomi.harakatLam = harakatLamAsal;

  return {
    diterapkan: true,
    pesan: `Kaidah 2 – Idghom: Dua huruf sama ('Ain dan Lam = ${anatomi.ainFiil}) ` +
      `digabungkan dengan Tasydid (ّ). Harakat 'Ain dipindahkan ke Fa' yang sukun. ` +
      `Contoh: رَدَدَ → رَدَّ.`,
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

  // KASUS 1: NAQISH
  if (ctx.bina.startsWith("Naqish") && ["Fi'il Amr", "Fi'il Nahyi"].includes(ctx.shighot)) {
    const lamIllat = anatomi.lamFiil === H.WAWU || anatomi.lamFiil === H.YA;
    if (lamIllat) {
      anatomi.lamFiil = "";
      anatomi.harakatLam = "";
      diterapkan = true;
      logPesan += `Kaidah 6 – Hazf Naqish. `;
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

  // Fa' al-Fi'l harus Hamzah (dalam berbagai bentuk)
  const faHamzah = [H.HAMZAH, H.HAMZAH_ATAS, H.HAMZAH_BAWAH].includes(anatomi.faFiil as typeof H.HAMZAH);
  if (!faHamzah) return { diterapkan: false, pesan: "" };

  // Mudhara'ah harus أ (hamzah mutakallim) — bukan ي/ت/ن
  if (anatomi.hurufMudhoroah !== H.HAMZAH_ATAS) return { diterapkan: false, pesan: "" };

  // Fa' harus sukun (untuk kondisi dua hamzah: hamzah mudhara'ah + hamzah Fa')
  if (anatomi.harakatFa !== H.SUKUN) return { diterapkan: false, pesan: "" };

  // Tentukan huruf Mad pengganti berdasarkan harakat mudhara'ah (Hamzah pertama)
  const harakatPertama = anatomi.harakatMudhoroah ?? H.FATHAH;
  let hurufMad: string;
  if (harakatPertama === H.KASRAH) hurufMad = H.YA;
  else if (harakatPertama === H.DHAMMAH) hurufMad = H.WAWU;
  else hurufMad = H.ALIF; // default: Fathah → Alif (paling umum)

  // Ganti Fa' (Hamzah sukun) menjadi Mad
  anatomi.faFiil = hurufMad;
  anatomi.harakatFa = "";

  return {
    diterapkan: true,
    pesan: `Kaidah 8 – Qalb Hamzah: Hamzah kedua (Fa' al-Fi'l sukun) yang bergabung ` +
      `dengan Hamzah pertama (Mudhara'ah) diganti menjadi huruf Mad ` +
      `(${hurufMad}) sesuai harakat pertama. Contoh: أَأْمَنَ → آمَنَ.`,
  };
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
  kaidah1HamzahWashal,                 // Hamzah Washal Amr
  kaidah2Idghom,                       // Idghom Mudha'af
  kaidah3WawuYaJadiAlif,               // Wawu/Ya → Alif (setelah Fathah)
  kaidah4Naql,                         // Pindah harakat + sukunkan illat
  kaidah5WawuYaJadiHamzah,             // Wawu/Ya → Hamzah (setelah Alif Zaidah)
  kaidah9BuangWawuMitsal,              // Buang Wawu Mitsal (antara fathah+kasrah)
  kaidah10WawuJadiYa,                  // Wawu sukun setelah kasrah → Ya
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
];

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
