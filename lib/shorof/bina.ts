/**
 * lib/shorof/bina.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deteksi jenis Bina' (struktur konsonan) dari akar kata Tsulatsi Mujarrad.
 * Berdasarkan kaidah ilmu Shorof klasik.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Terminologi:
 *   Fa' al-Fi'l  = huruf pertama dari akar kata (posisi ف)
 *   'Ain al-Fi'l = huruf kedua dari akar kata (posisi ع)
 *   Lam al-Fi'l  = huruf ketiga dari akar kata (posisi ل)
 *
 * Huruf Illat : و (Wawu), ي (Ya), ا (Alif) — menyebabkan perubahan I'lal
 * Hamzah      : ء أ إ ؤ ئ — menyebabkan kaidah Hamzah / Tashil
 */

// ══════════════════════════════════════════════════════════════════════════════
//  Set Karakter Klasifikasi
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Semua bentuk Hamzah dalam Unicode Arab.
 * ء (akhir/tunggal), أ (atas alif), إ (bawah alif), ؤ (di wawu), ئ (di ya)
 */
const HAMZAH_SET = new Set(["ء", "أ", "إ", "ؤ", "ئ"]);

/**
 * Huruf Illat: huruf-huruf lemah yang rawan perubahan fonetis.
 * و (Wawu) dan ي (Ya) adalah illat sejati; ا (Alif) biasanya hasil perubahan dari keduanya.
 */
const ILLAT_SET  = new Set(["و", "ي", "ا"]);
const WAWU       = "و";
const YA         = "ي";

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: Pembersih Harakat
// ══════════════════════════════════════════════════════════════════════════════

/**
 * hapusHarakat — Menghapus seluruh harakat (tanda baca / vokal) dari teks Arab.
 *
 * Range Unicode harakat:
 *   U+064B – U+065F : Fathatan s/d Superscript Alef
 *   U+0670          : Alif Khanjariyyah (sering pada isim maqsur)
 *
 * @param teks - Teks Arab yang mungkin mengandung harakat
 * @returns Teks Arab murni hanya konsonan (tanpa harakat)
 */
export function hapusHarakat(teks: string): string {
  return teks.replace(/[\u064B-\u065F\u0670]/g, "").trim();
}

// ══════════════════════════════════════════════════════════════════════════════
//  Fungsi Utama: Deteksi Bina'
// ══════════════════════════════════════════════════════════════════════════════

/**
 * deteksiBina — Menentukan jenis Bina' dari akar kata Tsulatsi Mujarrad.
 *
 * Urutan prioritas deteksi:
 *   1. Mahmuz (ada Hamzah)
 *   2. Mudha'af ('Ain = Lam)
 *   3. Lafif (dua huruf illat)
 *   4. Mitsal / Ajwaf / Naqish (satu huruf illat)
 *   5. Shahih Salim (normal)
 *
 * @param akarKata - Akar kata 3 huruf (boleh berharakat, akan dibersihkan)
 * @returns Nama jenis Bina' sebagai string
 */
export function deteksiBina(akarKata: string): string {
  // Bersihkan harakat agar hanya tersisa konsonan
  const bersih = hapusHarakat(akarKata);

  // Validasi: harus tepat 3 huruf konsonan
  if (bersih.length < 3) {
    return "Tidak Valid (kurang dari 3 huruf)";
  }

  const fa  = bersih[0]; // Fa' al-Fi'l  (ف)
  const ain = bersih[1]; // 'Ain al-Fi'l (ع)
  const lam = bersih[2]; // Lam al-Fi'l  (ل)

  // ── 1. Mahmuz: Ada Hamzah di salah satu posisi ──────────────────────────
  if (HAMZAH_SET.has(fa))  return "Mahmuz Fa'";
  if (HAMZAH_SET.has(ain)) return "Mahmuz 'Ain";
  if (HAMZAH_SET.has(lam)) return "Mahmuz Lam";

  // ── 2. Mudha'af: 'Ain dan Lam hurufnya identik ──────────────────────────
  // Contoh: مَدَّ (م-د-د), رَدَّ (ر-د-د)
  if (ain === lam) return "Mudha'af";

  // ── 3. Lafif: Ada dua huruf illat ───────────────────────────────────────
  const faIllat  = ILLAT_SET.has(fa);
  const ainIllat = ILLAT_SET.has(ain);
  const lamIllat = ILLAT_SET.has(lam);

  // Lafif Mafruq: Fa' dan Lam illat (terpisah oleh 'Ain shahih)
  // Contoh: وَقَى (و-ق-ي)
  if (faIllat && lamIllat) return "Lafif Mafruq";

  // Lafif Maqrun: 'Ain dan Lam sama-sama illat (berdampingan)
  // Contoh: رَوَى (ر-و-ي)
  if (ainIllat && lamIllat) return "Lafif Maqrun";

  // ── 4. Satu Huruf Illat ──────────────────────────────────────────────────

  // Mitsal: Illat di Fa' (awal kata)
  // Contoh: وَعَدَ (و-ع-د), يَسَرَ (ي-س-ر)
  if (faIllat) {
    return fa === WAWU ? "Mitsal Wawi" : "Mitsal Ya'i";
  }

  // Ajwaf: Illat di 'Ain (tengah kata) — kata paling sering berubah
  // Contoh: صَامَ ← صَوَمَ (ص-و-م), باعَ ← بَيَعَ (ب-ي-ع)
  if (ainIllat) {
    // Alif di posisi 'Ain biasanya adalah alif hasil perubahan dari Wawu/Ya,
    // untuk deteksi gunakan akar kata asli (bukan yang sudah di-I'lal)
    return ain === WAWU ? "Ajwaf Wawi"
         : ain === YA   ? "Ajwaf Ya'i"
                        : "Ajwaf Wawi"; // fallback: alif aslinya dari wawu
  }

  // Naqish: Illat di Lam (akhir kata)
  // Contoh: دَعَا (د-ع-و → berubah jadi alif), رَمَى (ر-م-ي)
  if (lamIllat) {
    // Alif di posisi Lam = biasanya aslinya Wawu (Naqish Wawi)
    // kecuali jika ada tanda lain, pakai heuristik: ba'da ain yang shahih
    if (lam === WAWU)  return "Naqish Wawi";
    if (lam === YA)    return "Naqish Ya'i";
    // Alif di posisi Lam → gunakan konteks (default Naqish Wawi karena lebih umum)
    return "Naqish Wawi";
  }

  // ── 5. Shahih Salim: Bebas dari Hamzah, Mudha'af, dan Illat ─────────────
  return "Shahih Salim";
}

// ══════════════════════════════════════════════════════════════════════════════
//  Helper: Klasifikasi Cepat
// ══════════════════════════════════════════════════════════════════════════════

/** Mengembalikan true jika bina mengandung huruf illat (bukan shahih) */
export function isGhayrSalim(bina: string): boolean {
  return !bina.startsWith("Shahih") && !bina.startsWith("Mahmuz");
}

/** Mengembalikan true jika bina adalah Ajwaf (illat di 'Ain) */
export function isAjwaf(bina: string): boolean {
  return bina.startsWith("Ajwaf");
}

/** Mengembalikan true jika bina adalah Mitsal (illat di Fa') */
export function isMitsal(bina: string): boolean {
  return bina.startsWith("Mitsal");
}

/** Mengembalikan true jika bina adalah Naqish (illat di Lam) */
export function isNaqish(bina: string): boolean {
  return bina.startsWith("Naqish");
}

/** Mengembalikan true jika bina adalah Mudha'af ('Ain = Lam) */
export function isMudhaaaf(bina: string): boolean {
  return bina === "Mudha'af";
}
