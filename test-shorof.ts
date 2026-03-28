// test-shorof.ts
import { generateSemuaTasrif } from './lib/shorof/tasrifGenerator';

async function jalankanTes() {
    console.log("=== MEMULAI TES MESIN MUFRODATI V2 ===");

    // Tes 1: Mitsal Wawi (Bab 2)
    // Ekspektasi: Masdar Mim -> مَوْعِدٌ (karena Bab 2/Mitsal), Isim Alat -> مِيعَادٌ (I'lal Kaidah 10)
    console.log("\n[Tes 1: Akar Kata 'وعد' (Berjanji) - Bab 2 | Alat: مِفْعَالٌ]");
    const hasilWada = generateSemuaTasrif('وعد', 'Berjanji', 2, 'وَعْدًا', { polaAlat: 'مِفْعَالٌ' });
    console.log("Hasil Tasrif:", hasilWada);

    // Tes 2: Shahih Salim (Bab 1)
    // Ekspektasi: Masdar Mim -> مَنْصَرٌ (Default fathah), Isim Alat -> مِنْصَارٌ
    console.log("\n[Tes 2: Akar Kata 'نصر' (Menolong) - Bab 1 | Alat: مِفْعَالٌ]");
    const hasilNasara = generateSemuaTasrif('نصر', 'Menolong', 1, 'نَصْرًا', { polaAlat: 'مِفْعَالٌ' });
    console.log("Hasil Tasrif:", hasilNasara);

    // Tes 3: Shahih Salim dengan Ta' Marbuthah (Bab 1)
    // Ekspektasi: Masdar Mim -> مَكْنَسٌ, Isim Alat -> مِكْنَسَةٌ
    console.log("\n[Tes 3: Akar Kata 'كنس' (Menyapu) - Bab 1 | Alat: مِفْعَلَةٌ]");
    const hasilKanas = generateSemuaTasrif('كنس', 'Menyapu', 1, 'كَنْسًا', { polaAlat: 'مِفْعَلَةٌ' });
    console.log("Hasil Tasrif:", hasilKanas);
    console.log("\n[Tes 4: Akar Kata 'صوم' (Berpuasa) - Bab 1 | polaAlat: Tidak Ada]");
    const hasilShaum = generateSemuaTasrif('صوم', 'Berpuasa', 1, 'صَوْمًا', { polaAlat: 'Tidak Ada' });
    console.log("Hasil Tasrif:", hasilShaum);

    console.log("\n=== TES SELESAI ===");
}

jalankanTes();