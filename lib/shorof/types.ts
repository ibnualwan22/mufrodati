/**
 * lib/shorof/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Definisi tipe data utama untuk sistem Morfologi Arab (Shorof Engine).
 * Semua interface dirancang agar strict-typed dan siap untuk diperluas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════════════════
//  Anatomi Kata (Positional Mapping)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * AnatomiKata — Peta posisi huruf-huruf penyusun sebuah kata Arab berdasarkan
 * struktur morfologisnya. Setiap properti merepresentasikan satu "slot" posisi
 * dalam wazan (pola) kata tersebut.
 *
 * Urutan rendering:
 *   hurufZiyadahAwal? + hurufMudhoroah? + harakatMudhoroah? +
 *   faFiil + harakatFa +
 *   hurufZiyadahTengah? +
 *   ainFiil + harakatAin +
 *   lamFiil + harakatLam +
 *   hurufZiyadahAkhir?
 */
export interface AnatomiKata {
  /** Huruf tambahan di awal kata (misal: م pada Masdar Mim, atau يـ pada Mudhari') */
  hurufZiyadahAwal?: string;
  hurufZiyadahSetelahAin?: string; // Khusus untuk Isim Maf'ul dan Isim Alat

  /** Huruf Mudhara'ah (ي/ت/أ/ن) — hanya pada Fi'il Mudhari' */
  hurufMudhoroah?: string;

  /** Harakat huruf Mudhara'ah (selalu Fathah على الإفراد) */
  harakatMudhoroah?: string;

  /** Fa' al-Fi'l — huruf pertama dari akar kata */
  faFiil: string;

  /** Harakat Fa' al-Fi'l */
  harakatFa: string;

  /** Huruf ziyadah di tengah kata (misal: ا pada Isim Fa'il فَاعِل) */
  hurufZiyadahTengah?: string;

  /** 'Ain al-Fi'l — huruf kedua dari akar kata */
  ainFiil: string;

  /** Harakat 'Ain al-Fi'l */
  harakatAin: string;

  /** Lam al-Fi'l Pertama (Khusus Ruba'i / Akar 4 Huruf) */
  lamFiilKedua?: string;

  /** Harakat Lam al-Fi'l Pertama */
  harakatLamKedua?: string;

  /** Lam al-Fi'l — huruf ketiga (atau ke-empat untuk Ruba'i) dari akar kata */
  lamFiil: string;

  /** Harakat Lam al-Fi'l (atau sufiks akhir: ُ/ِ/tanwin/sukun) */
  harakatLam: string;

  /**
   * Huruf tambahan di akhir kata setelah Lam al-Fi'l.
   * Contoh: ون pada Jama' Mudzkkar Salim, ة pada muannats, ن pada tanwin.
   */
  hurufZiyadahAkhir?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Konteks Kata (Word Context)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * WordContext — Data kontekstual sebuah kata yang dibutuhkan oleh wazanBuilder
 * dan ilalEngine untuk menghasilkan anatomi dan analisis yang tepat.
 */
export interface WordContext {
  /** Akar kata tiga huruf (Tsulatsi Mujarrad), tanpa harakat */
  akarKata: string;

  /**
   * Nomor Bab Fi'il (1–6) untuk Tsulatsi Mujarrod, atau string identifier wazan 
   * untuk Tsulatsi Mazid / Ruba'i (misal: "af'ala", "fa''ala", "istaf'ala").
   * Sistem Bab mengacu pada tradisi ilmu Shorof klasik:
   *   Bab 1: فَعَلَ – يَفْعُلُ   (contoh: نَصَرَ)
   *   Bab 2: فَعَلَ – يَفْعِلُ   (contoh: ضَرَبَ)
   *   Bab 3: فَعَلَ – يَفْعَلُ   (contoh: فَتَحَ)
   *   Bab 4: فَعِلَ – يَفْعَلُ   (contoh: عَلِمَ)
   *   Bab 5: فَعُلَ – يَفْعُلُ   (contoh: حَسُنَ)
   *   Bab 6: فَعِلَ – يَفْعِلُ   (contoh: حَسِبَ)
   */
  bab: 1 | 2 | 3 | 4 | 5 | 6 | string;

  /**
   * Jenis bina' (hasil dari deteksiBina).
   * Contoh: "Shahih Salim", "Ajwaf Wawi", "Mitsal Wawi", dll.
   */
  bina: string;

  /**
   * Bentuk morfologis (Shighot) yang sedang dianalisis.
   * Menentukan wazan dan ziyadah yang digunakan.
   */
  shighot:
  | "Fi'il Madhi"
  | "Fi'il Mudhari'"
  | "Masdar"
  | "Masdar Mim"
  | "Isim Fa'il"
  | "Isim Maf'ul"
  | "Fi'il Amr"
  | "Fi'il Nahyi"
  | "Isim Zaman/Makan"
  | "Isim Alat"
  | string; // open untuk shighot non-standar

  /**
   * Pola wazan Isim Alat yang dipilih admin.
   * Tiga wazan resmi Isim Alat dalam Shorof klasik:
   *   - "مِفْعَلٌ"  : pola standar (misal: مِفْتَاحٌ aslinya مِفْتَحٌ)
   *   - "مِفْعَالٌ" : pola madd (ada Alif zaidah antara Ain dan Lam)
   *   - "مِفْعَلَةٌ": pola Ta' Marbuthah di akhir
   *   - "Tidak Ada" : fi'il ini tidak mempunyai Isim Alat
   * Jika tidak diisi, default ke "مِفْعَلٌ".
   */
  polaAlat?: "مِفْعَلٌ" | "مِفْعَالٌ" | "مِفْعَلَةٌ" | "Tidak Ada";
}

// ══════════════════════════════════════════════════════════════════════════════
//  Hasil Proses I'lal
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ProsesIlal — Hasil akhir dari analisis morfologis dan penerapan kaidah I'lal.
 * Digunakan oleh ilalEngine dan dikembalikan ke API layer.
 */
export interface ProsesIlal {
  /** Kata asli yang dimasukkan pengguna (sebelum diproses) */
  asalKata: string;

  /** Kata hasil setelah seluruh kaidah I'lal diterapkan */
  hasilAkhir: string;

  /**
   * Daftar langkah (log) yang menjelaskan kaidah apa yang diterapkan, secara berurutan,
   * dilengkapi dengan hasil render kata SETELAH kaidah tersebut diterapkan.
   * Jika tidak ada kaidah yang berlaku, array ini kosong.
   */
  logProses: { pesan: string; hasilSementara: string }[];

  /** Jenis bina' dari kata yang dianalisis */
  bina: string;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Utilitas Tipe Tambahan
// ══════════════════════════════════════════════════════════════════════════════

/**
 * HarakatMap — Peta harakat berdasarkan nomor bab untuk Madhi dan Mudhari'.
 * Digunakan oleh wazanBuilder.ts untuk menetapkan harakat yang tepat.
 */
export interface HarakatMap {
  /** Harakat 'Ain pada Fi'il Madhi */
  harakatAinMadhi: string;
  /** Harakat 'Ain pada Fi'il Mudhari' */
  harakatAinMudhari: string;
}
