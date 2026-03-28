import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Memulai proses seeding...')

  // Kata 1: Shahih Salim (Tidak ada i'lal)
  const kata1 = await prisma.word.create({
    data: {
      rootWord: 'نصر',
      indonesian: 'Menolong',
      bab: 'Bab 1 (فَعَلَ - يَفْعُلُ)',
      bina: 'Shahih Salim',
      madhi: 'نَصَرَ',
      mudhari: 'يَنْصُرُ',
      masdar: 'نَصْرًا',
      masdarMim: 'مَنْصَرًا',
      faail: 'نَاصِرٌ',
      mafuul: 'مَنْصُورٌ',
      amr: 'اُنْصُرْ',
      nahyi: 'لَا تَنْصُرْ',
      zamanMakan: 'مَنْصَرٌ',
      alaat: 'مِنْصَرٌ',
    },
  })

  // Kata 2: Ajwaf Wawi (Ada proses i'lal)
  const kata2 = await prisma.word.create({
    data: {
      rootWord: 'صوم',
      indonesian: 'Berpuasa',
      bab: 'Bab 1 (فَعَلَ - يَفْعُلُ)',
      bina: 'Ajwaf Wawi',
      madhi: 'صَامَ',
      mudhari: 'يَصُوْمُ',
      masdar: 'صَوْمًا',
      masdarMim: 'مَصَامًا', 
      faail: 'صَائِمٌ',
      mafuul: 'مَصُوْمٌ',
      amr: 'صُمْ',
      nahyi: 'لَا تَصُمْ',
      zamanMakan: 'مَصَامٌ',
      alaat: null, // Kosongkan jika tidak umum digunakan
    },
  })

  // Kata 3: Mitsal Wawi (Huruf wawu dibuang di mudhari)
  const kata3 = await prisma.word.create({
    data: {
      rootWord: 'وعد',
      indonesian: 'Berjanji',
      bab: 'Bab 2 (فَعَلَ - يَفْعِلُ)',
      bina: 'Mitsal Wawi',
      madhi: 'وَعَدَ',
      mudhari: 'يَعِدُ',
      masdar: 'وَعْدًا',
      masdarMim: 'مَوْعِدًا',
      faail: 'وَاعِدٌ',
      mafuul: 'مَوْعُودٌ',
      amr: 'عِدْ',
      nahyi: 'لَا تَعِدْ',
      zamanMakan: 'مَوْعِدٌ',
      alaat: 'مِيعَادٌ',
    },
  })

  console.log('Seeding selesai! 3 kosakata berhasil ditambahkan.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })