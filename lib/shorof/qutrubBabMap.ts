/**
 * lib/shorof/qutrubBabMap.ts
 *
 * Tabel konversi Bab Qutrub → format Web Mufrodati.
 *
 * Qutrub memakai dua sistem:
 * - Mujarrad: angka 1-6
 * - Mazid: ID angka ("11", "112", "126", dll)
 *
 * Web Mufrodati memakai:
 * - Mujarrad: "Bab 1" - "Bab 6"
 * - Mazid: nama wazan ("af'ala", "fa''ala", dll)
 * - Ruba'i: "fa'lala", "tafa'lala", "if'anlala", "if'alalla"
 */

/** Hasil konversi: format web + jenis fi'il */
export interface BabKonversi {
  /** Format web: "Bab 1" / "af'ala" / "fa'lala" */
  babWeb: string;
  /** "mujarrad" | "mazid" */
  jenisFiil: "mujarrad" | "mazid";
  /** Jumlah huruf akar: 3 (tsulatsi) | 4 (ruba'i) */
  hurufAkar: 3 | 4;
}

/**
 * Map ID Qutrub (mazid) → nama wazan standar.
 * Berdasarkan normalizeBabMazid() di mazidBuilder.ts
 */
const QUTRUB_MAZID_MAP: Record<string, string> = {
  "11": "af'ala",
  "53": "af'ala",
  "56": "af'ala",
  "61": "af'ala",
  "73": "infa'ala",
  "112": "fa''ala",
  "115": "ifta'ala",
  "119": "faa'ala",
  "120": "faa'ala",
  "123": "tafaa'ala",
  "126": "tafa''ala",
  "130": "istaf'ala",
};

/**
 * Konversi bab Qutrub ke format web.
 *
 * @param qutrubBab - Bab dari Qutrub (number 1-6 untuk mujarrad, string ID untuk mazid)
 * @param verb - Kata kerja asli (untuk deteksi ruba'i dari panjang kata)
 * @returns BabKonversi atau null jika tidak dikenali
 */
export function konversiBabQutrub(
  qutrubBab: number | string,
  verb?: string
): BabKonversi | null {
  const babStr = String(qutrubBab);

  // 1. Mujarrad: angka 1-6
  const babNum = parseInt(babStr);
  if (!isNaN(babNum) && babNum >= 1 && babNum <= 6 && babStr.length === 1) {
    return {
      babWeb: `Bab ${babNum}`,
      jenisFiil: "mujarrad",
      hurufAkar: 3,
    };
  }

  // 2. Mazid: ID Qutrub → wazan
  if (QUTRUB_MAZID_MAP[babStr]) {
    return {
      babWeb: QUTRUB_MAZID_MAP[babStr],
      jenisFiil: "mazid",
      hurufAkar: 3,
    };
  }

  // 3. Ruba'i: deteksi dari panjang verb (4 huruf berharakat ≈ 8+ karakter)
  //    Untuk saat ini, kembalikan null agar ditangani manual/AI
  return null;
}

/**
 * Daftar semua wazan mazid yang valid di web.
 */
export const MAZID_WAZAN_VALID = [
  "af'ala",
  "fa''ala",
  "faa'ala",
  "tafa''ala",
  "tafaa'ala",
  "ifta'ala",
  "infa'ala",
  "istaf'ala",
  "if'alla",
  "if'aalla",
  "if'aw'ala",
  "if'awwala",
];

/**
 * Daftar wazan ruba'i yang valid di web.
 */
export const RUBAI_WAZAN_VALID = [
  "fa'lala",    // فَعْلَلَ (mujarrad ruba'i)
  "tafa'lala",  // تَفَعْلَلَ
  "if'anlala",  // اِفْعَنْلَلَ
  "if'alalla",  // اِفْعَلَلَّ
];
