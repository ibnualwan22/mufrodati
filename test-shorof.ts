// test-shorof.ts
// ══════════════════════════════════════════════════════════════════
//  TEST KOMPREHENSIF — 13 JENIS BINA' SHOROF
//  Mencakup: Shahih Salim, Mahmuz (3 posisi), Mudha'af,
//            Mitsal (Wawi/Ya'i), Ajwaf (Wawi/Ya'i),
//            Naqish (Wawi/Ya'i), Lafif (Mafruq/Maqrun)
// ══════════════════════════════════════════════════════════════════
import { generateSemuaTasrif, previewTasrif, GeneratedWordData } from './lib/shorof/tasrifGenerator';

type PolaAlat = "مِفْعَلٌ" | "مِفْعَالٌ" | "مِفْعَلَةٌ" | "Tidak Ada";

// ─────────────────────────────────────────────────────────────────
//  Referensi Jawaban yang Diharapkan
//  Format: { shighot: hasil_benar }
//  Diisi berdasarkan kitab Amtsilatut Tasrifiyah / ATA / kaidah
// ─────────────────────────────────────────────────────────────────
interface CekHasil {
    madhi?: string;
    mudhari?: string;
    masdarMim?: string;
    faail?: string;
    mafuul?: string | null;
    amr?: string;
    nahyi?: string;
    zamanMakan?: string;
    alaat?: string | null;
}

interface KasusTes {
    nama: string;
    root: string;
    arti: string;
    bab: 1 | 2 | 3 | 4 | 5 | 6;
    masdar: string;
    alat?: PolaAlat;
    lazim?: boolean;
    expected: CekHasil;
}

// ─────────────────────────────────────────────────────────────────
//  DEFINISI TES
// ─────────────────────────────────────────────────────────────────
const KASUS_TES: KasusTes[] = [

    // ═══════════════════════════════════════════════
    //  1. SHAHIH SALIM
    // ═══════════════════════════════════════════════
    {
        nama: "1a. Shahih Salim – Bab 1 (فَعَلَ يَفْعُلُ)",
        root: "نصر", arti: "menolong", bab: 1, masdar: "نَصْرًا", alat: "مِفْعَالٌ",
        expected: {
            madhi: "نَصَرَ",
            mudhari: "يَنْصُرُ",
            masdarMim: "مَنْصَرٌ",
            faail: "نَاصِرٌ",
            mafuul: "مَنْصُورٌ",
            amr: "اُنْصُرْ",
            nahyi: "لَا تَنْصُرْ",
            zamanMakan: "مَنْصَرٌ",
            alaat: "مِنْصَارٌ",
        },
    },
    {
        nama: "1b. Shahih Salim – Bab 2 (فَعَلَ يَفْعِلُ)",
        root: "ضرب", arti: "memukul", bab: 2, masdar: "ضَرْبًا", alat: "مِفْعَلَةٌ",
        expected: {
            madhi: "ضَرَبَ",
            mudhari: "يَضْرِبُ",
            faail: "ضَارِبٌ",
            mafuul: "مَضْرُوبٌ",
            amr: "اِضْرِبْ",
            nahyi: "لَا تَضْرِبْ",
        },
    },
    {
        nama: "1c. Shahih Salim – Bab 3 (فَعَلَ يَفْعَلُ)",
        root: "فتح", arti: "membuka", bab: 3, masdar: "فَتْحًا", alat: "مِفْعَلٌ",
        expected: {
            madhi: "فَتَحَ",
            mudhari: "يَفْتَحُ",
            faail: "فَاتِحٌ",
            mafuul: "مَفْتُوحٌ",
            amr: "اِفْتَحْ",
        },
    },

    // ═══════════════════════════════════════════════
    //  2. MAHMUZ
    // ═══════════════════════════════════════════════
    {
        nama: "2a. Mahmuz Fa' – Bab 1 (أَمَرَ يَأْمُرُ)",
        root: "أمر", arti: "memerintah", bab: 1, masdar: "أَمْرًا", alat: "مِفْعَالٌ",
        expected: {
            madhi: "أَمَرَ",
            mudhari: "يَأْمُرُ",
            faail: "آمِرٌ",    // Hamzah fathah + Alif Zaidah → Alif Maddah
            mafuul: "مَأْمُورٌ",
            amr: "مُرْ", // سماعي: li katsroti isti'mal, hamzah dibuang
        },
    },
    {
        nama: "2b. Mahmuz Fa' – Bab 1 (أَكَلَ يَأْكُلُ)",
        root: "أكل", arti: "memakan", bab: 1, masdar: "أَكْلًا", alat: "Tidak Ada",
        expected: {
            madhi: "أَكَلَ",
            mudhari: "يَأْكُلُ",
            faail: "آكِلٌ",
            mafuul: "مَأْكُولٌ",
            amr: "كُلْ",     // (kaidah 8: hamzah washal + hamzah fa' → gugur)
        },
    },
    {
        nama: "2c. Mahmuz 'Ain – Bab 1 (سَأَلَ يَسْأَلُ)",
        root: "سأل", arti: "bertanya", bab: 3, masdar: "سَأَلًا", alat: "Tidak Ada",
        expected: {
            madhi: "سَأَلَ",
            mudhari: "يَسْأَلُ",
            faail: "سَائِلٌ",
            mafuul: "مَسْؤُولٌ",
            amr: "اِسْأَلْ",
        },
    },
    {
        nama: "2d. Mahmuz Lam – Bab 1 (قَرَأَ يَقْرَأُ)",
        root: "قرأ", arti: "membaca", bab: 3, masdar: "قَرَأًا", alat: "Tidak Ada",
        expected: {
            madhi: "قَرَأَ",
            mudhari: "يَقْرَأُ",
            faail: "قَارِئٌ",
            mafuul: "مَقْرُوءٌ",
            amr: "اِقْرَأْ",
        },
    },

    // ═══════════════════════════════════════════════
    //  3. MUDHA'AF
    // ═══════════════════════════════════════════════
    {
        nama: "3a. Mudha'af – Bab 1 (مَدَّ يَمُدُّ)",
        root: "مدد", arti: "memanjangkan", bab: 1, masdar: "مَدًّا", alat: "مِفْعَلَةٌ",
        expected: {
            madhi: "مَدَّ",
            mudhari: "يَمُدُّ",
            faail: "مَادٌّ",
            mafuul: "مَمْدُودٌ",
            amr: "مُدَّ",
            nahyi: "لَا تَمُدَّ",
        },
    },
    {
        nama: "3b. Mudha'af – Bab 1 (رَدَّ يَرُدُّ)",
        root: "ردد", arti: "mengembalikan", bab: 1, masdar: "رَدًّا", alat: "Tidak Ada",
        expected: {
            madhi: "رَدَّ",
            mudhari: "يَرُدُّ",
            faail: "رَادٌّ",
            amr: "رُدَّ",
        },
    },

    // ═══════════════════════════════════════════════
    //  4. MITSAL
    // ═══════════════════════════════════════════════
    {
        nama: "4a. Mitsal Wawi – Bab 2 (وَعَدَ يَعِدُ)",
        root: "وعد", arti: "berjanji", bab: 2, masdar: "وَعْدًا", alat: "مِفْعَالٌ",
        expected: {
            madhi: "وَعَدَ",
            mudhari: "يَعِدُ",    // Kaidah 9: Wawu Mitsal gugur
            faail: "وَاعِدٌ",
            mafuul: "مَوْعُودٌ",
            amr: "عِدْ",     // Wawu gugur + Hamzah Washal gugur
            nahyi: "لَا تَعِدْ",
            zamanMakan: "مَوْعِدٌ",
            alaat: "مِيعَادٌ",
        },
    },
    {
        nama: "4b. Mitsal Wawi – Bab 1 (وَجَدَ يَجِدُ)",
        root: "وجد", arti: "menemukan", bab: 2, masdar: "وُجُودًا", alat: "Tidak Ada",
        expected: {
            madhi: "وَجَدَ",
            mudhari: "يَجِدُ",   // Kaidah 9: Wawu gugur
            amr: "جِدْ",
        },
    },
    {
        nama: "4c. Mitsal Ya'i – Bab 2 (يَسَرَ يَيْسِرُ → يَيْسِرُ)",
        root: "يسر", arti: "memudahkan", bab: 2, masdar: "يُسْرًا", alat: "Tidak Ada",
        expected: {
            madhi: "يَسَرَ",
            mudhari: "يَيْسِرُ", // Mitsal Ya'i tidak terbuang di mudhari'
            faail: "يَاسِرٌ",
        },
    },

    // ═══════════════════════════════════════════════
    //  5. AJWAF
    // ═══════════════════════════════════════════════
    {
        nama: "5a. Ajwaf Wawi – Bab 1 (صَامَ يَصُومُ)",
        root: "صوم", arti: "berpuasa", bab: 1, masdar: "صَوْمًا", alat: "Tidak Ada",
        expected: {
            madhi: "صَامَ",
            mudhari: "يَصُومُ",
            masdarMim: "مَصَامٌ",
            faail: "صَائِمٌ",
            mafuul: "مَصُومٌ",
            amr: "صُمْ",    // Kaidah 6: huruf illat gugur
            nahyi: "لَا تَصُمْ",
            zamanMakan: "مَصَامٌ",
        },
    },
    {
        nama: "5b. Ajwaf Wawi – Bab 2 (قَالَ يَقُولُ)",
        root: "قول", arti: "berkata", bab: 1, masdar: "قَوْلًا", alat: "Tidak Ada",
        expected: {
            madhi: "قَالَ",
            mudhari: "يَقُولُ",
            faail: "قَائِلٌ",
            mafuul: "مَقُولٌ",
            amr: "قُلْ",
            nahyi: "لَا تَقُلْ",
        },
    },
    {
        nama: "5c. Ajwaf Ya'i – Bab 2 (بَاعَ يَبِيعُ)",
        root: "بيع", arti: "menjual", bab: 2, masdar: "بَيْعًا", alat: "Tidak Ada",
        expected: {
            madhi: "بَاعَ",
            mudhari: "يَبِيعُ",
            faail: "بَائِعٌ",
            mafuul: "مَبِيعٌ",
            amr: "بِعْ",
            nahyi: "لَا تَبِعْ",
        },
    },
    {
        nama: "5d. Ajwaf Ya'i – Bab 3 (خَافَ يَخَافُ)",
        root: "خوف", arti: "takut", bab: 3, masdar: "خَوْفًا", alat: "Tidak Ada", lazim: true,
        expected: {
            madhi: "خَافَ",
            mudhari: "يَخَافُ",
            faail: "خَائِفٌ",
            mafuul: null,  // lazim
            amr: "خَفْ",
        },
    },

    // ═══════════════════════════════════════════════
    //  6. NAQISH
    // ═══════════════════════════════════════════════
    {
        nama: "6a. Naqish Wawi – Bab 1 (دَعَا يَدْعُو)",
        root: "دعو", arti: "berdoa/menyeru", bab: 1, masdar: "دَعْوَةً", alat: "Tidak Ada",
        expected: {
            madhi: "دَعَا",    // Kaidah 3: Wawu → Alif
            mudhari: "يَدْعُو",
            masdarMim: "مَدْعًى",
            faail: "دَاعٍ",   // Kaidah Isim Manqush
            mafuul: "مَدْعُوٌّ", // Kaidah Idghom Maf'ul Naqish
            amr: "اُدْعُ",   // Kaidah 6: Wawu gugur
            nahyi: "لَا تَدْعُ",
            zamanMakan: "مَدْعًى",
        },
    },
    {
        nama: "6b. Naqish Ya'i – Bab 2 (رَمَى يَرْمِي)",
        root: "رمي", arti: "melempar", bab: 2, masdar: "رَمْيًا", alat: "مِفْعَلٌ",
        expected: {
            madhi: "رَمَى",    // Kaidah 3: Ya → Alif Maqshurah
            mudhari: "يَرْمِي",
            faail: "رَامٍ",   // Kaidah Isim Manqush
            mafuul: "مَرْمِيٌّ", // Kaidah Idghom Maf'ul Naqish Ya'i
            amr: "اِرْمِ",   // Kaidah 6: Ya gugur
            nahyi: "لَا تَرْمِ",
            zamanMakan: "مَرْمًى",
        },
    },

    // ═══════════════════════════════════════════════
    //  7. LAFIF
    // ═══════════════════════════════════════════════
    {
        nama: "7a. Lafif Mafruq – Bab 2 (وَقَى يَقِي)",
        root: "وقي", arti: "menjaga/melindungi", bab: 2, masdar: "وِقَايَةً", alat: "Tidak Ada",
        expected: {
            madhi: "وَقَى",
            mudhari: "يَقِي",   // Kaidah 9 (Fa' Wawu gugur) + Kaidah 3 (Lam Ya → Alif)
            faail: "وَاقٍ",
            mafuul: "مَوْقِيٌّ",
            amr: "قِ",      // Paling pendek dalam bahasa Arab!
            nahyi: "لَا تَقِ",
        },
    },
    {
        nama: "7b. Lafif Maqrun – Bab 2 (طَوَى يَطْوِي)",
        root: "طوي", arti: "melipat", bab: 2, masdar: "طَيًّا", alat: "Tidak Ada",
        expected: {
            madhi: "طَوَى",   // Kaidah 3: Lam Ya → Alif Maqshurah
            mudhari: "يَطْوِي",
            faail: "طَاوٍ",
            amr: "اِطْوِ",
            nahyi: "لَا تَطْوِ",
        },
    },
];

// ─────────────────────────────────────────────────────────────────
//  Runner dengan Perbandingan Otomatis
// ─────────────────────────────────────────────────────────────────

const ANSI = {
    RESET: "\x1b[0m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    CYAN: "\x1b[36m",
    BOLD: "\x1b[1m",
    DIM: "\x1b[2m",
};

function bandingkan(shighot: string, hasil: string | null, expected: string | null | undefined): string {
    if (expected === undefined) return ""; // tidak ada ekspektasi → skip
    if (expected === null && hasil === null) return `${ANSI.GREEN}✅${ANSI.RESET}`;
    if (hasil === expected) return `${ANSI.GREEN}✅${ANSI.RESET}`;
    return `${ANSI.RED}❌ (expected: ${expected ?? "—"})${ANSI.RESET}`;
}

function cetakHasil(data: GeneratedWordData, expected: CekHasil): void {
    const rows: [string, string | null, string | null | undefined][] = [
        ["Madhi", data.madhi, expected.madhi],
        ["Mudhari'", data.mudhari, expected.mudhari],
        ["Masdar Mim", data.masdarMim, expected.masdarMim],
        ["Isim Fa'il", data.faail, expected.faail],
        ["Isim Maf'ul", data.mafuul, expected.mafuul],
        ["Fi'il Amr", data.amr, expected.amr],
        ["Fi'il Nahyi", data.nahyi, expected.nahyi],
        ["Zaman/Makan", data.zamanMakan, expected.zamanMakan],
        ["Isim Alat", data.alaat, expected.alaat],
    ];

    for (const [label, nilai, exp] of rows) {
        const status = bandingkan(label, nilai, exp);
        const nilaiStr = nilai ?? "—";
        const expStr = exp !== undefined ? ` (exp: ${exp ?? "—"})` : "";
        const marker = status || `${ANSI.DIM}—${ANSI.RESET}`;
        console.log(`  ${marker}  ${label.padEnd(12)} : ${ANSI.BOLD}${nilaiStr}${ANSI.RESET}`);
    }
}

async function jalankanTesBina() {
    console.log(`\n${ANSI.BOLD}${ANSI.CYAN}${"═".repeat(60)}${ANSI.RESET}`);
    console.log(`${ANSI.BOLD}${ANSI.CYAN}  TEST KOMPREHENSIF — 13 BINA' SHOROF${ANSI.RESET}`);
    console.log(`${ANSI.BOLD}${ANSI.CYAN}${"═".repeat(60)}${ANSI.RESET}\n`);

    let totalLulus = 0;
    let totalGagal = 0;
    let totalCek = 0;

    for (const t of KASUS_TES) {
        console.log(`${ANSI.BOLD}${ANSI.YELLOW}┌─ ${t.nama} — «${t.root}» (${t.arti}) – Bab ${t.bab}${ANSI.RESET}`);

        const hasil = generateSemuaTasrif(
            t.root,
            t.arti,
            t.bab,
            t.masdar,
            { polaAlat: t.alat, lazim: t.lazim },
        );

        console.log(`${ANSI.DIM}│  Bina' terdeteksi: ${hasil.bina}${ANSI.RESET}`);

        // Cek per shighot
        const maps: [string, string | null, string | null | undefined][] = [
            ["Madhi", hasil.madhi, t.expected.madhi],
            ["Mudhari'", hasil.mudhari, t.expected.mudhari],
            ["Masdar Mim", hasil.masdarMim, t.expected.masdarMim],
            ["Isim Fa'il", hasil.faail, t.expected.faail],
            ["Isim Maf'ul", hasil.mafuul, t.expected.mafuul],
            ["Fi'il Amr", hasil.amr, t.expected.amr],
            ["Fi'il Nahyi", hasil.nahyi, t.expected.nahyi],
            ["Zaman/Makan", hasil.zamanMakan, t.expected.zamanMakan],
            ["Isim Alat", hasil.alaat, t.expected.alaat],
        ];

        for (const [label, nilai, exp] of maps) {
            if (exp === undefined) continue; // tidak dikecek
            totalCek++;
            const lulus = (exp === null && nilai === null) || nilai === exp;
            if (lulus) totalLulus++;
            else totalGagal++;

            const icon = lulus ? `${ANSI.GREEN}✅` : `${ANSI.RED}❌`;
            const info = lulus ? "" : ` ← expected: ${ANSI.BOLD}${exp ?? "—"}${ANSI.RESET}`;
            console.log(`${ANSI.RESET}│  ${icon} ${label.padEnd(12)}: ${ANSI.BOLD}${nilai ?? "—"}${ANSI.RESET}${info}`);
        }

        console.log(`${ANSI.DIM}└${"─".repeat(56)}${ANSI.RESET}\n`);
    }

    // ─── RINGKASAN ────────────────────────────────────────────────
    console.log(`${ANSI.BOLD}${"═".repeat(60)}${ANSI.RESET}`);
    console.log(`${ANSI.BOLD}  LAPORAN AKHIR${ANSI.RESET}`);
    console.log(`${"─".repeat(60)}`);
    console.log(`  Total tes dikecek : ${totalCek}`);
    console.log(`  ${ANSI.GREEN}✅ Lulus${ANSI.RESET}           : ${totalLulus}`);
    console.log(`  ${ANSI.RED}❌ Gagal${ANSI.RESET}           : ${totalGagal}`);
    const pct = totalCek > 0 ? Math.round((totalLulus / totalCek) * 100) : 0;
    const warna = pct >= 90 ? ANSI.GREEN : pct >= 70 ? ANSI.YELLOW : ANSI.RED;
    console.log(`  ${warna}${ANSI.BOLD}Akurasi            : ${pct}%${ANSI.RESET}`);
    console.log(`${"═".repeat(60)}\n`);
}

jalankanTesBina().catch(console.error);