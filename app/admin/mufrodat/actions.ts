"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateSemuaTasrifDetail } from "@/lib/shorof/tasrifGenerator";
import { deteksiBina } from "@/lib/shorof/bina";
import { generateArtiPerShighot } from "@/lib/shorof/artiGenerator";

export async function getMufrodatList(page: number = 1, limit: number = 20, letter?: string) {
  const skip = (page - 1) * limit;
  let where: any = {};
  
  if (letter && letter !== "Semua") {
    if (letter === "ا") {
      where = {
        OR: [
          { rootWord: { startsWith: "ا" } },
          { rootWord: { startsWith: "أ" } },
          { rootWord: { startsWith: "إ" } },
          { rootWord: { startsWith: "آ" } },
        ]
      };
    } else {
      where = { rootWord: { startsWith: letter } };
    }
  }

  const [data, total] = await Promise.all([
    prisma.word.findMany({
      where,
      skip,
      take: limit,
      orderBy: { rootWord: "asc" },
    }),
    prisma.word.count({ where }),
  ]);
  
  return { data, total, totalPages: Math.ceil(total / limit) };
}

export async function calculateShorofPreview(
  akarKata: string,
  bab: string,
  indonesian: string = "",
  masdar: string = "",
  polaAlat: string = "mif'alun" // using safe default mapping
) {
  if (!akarKata || akarKata.length < 3) return null;
  
  // Jika bab adalah wazan mazid/rubai, biarkan. Jika "Bab N", ambil angkanya.
  const mazidWazans = [
    "af'ala", "fa''ala", "faa'ala", "tafa''ala", "tafaa'ala", 
    "ifta'ala", "infa'ala", "istaf'ala", "if'alla", "if'aalla", 
    "if'aw'ala", "if'awwala",
    "fa'lala", "tafa'lala", "if'anlala", "if'alalla"
  ];
  let parsedBab: string | number = bab;
  if (!mazidWazans.includes(bab)) {
    parsedBab = parseInt(bab.replace(/\D/g, "") || "1");
  }
  
  // Mapping pola alat to proper Arabic if needed, or we just pass undefined
  let polaAlatEnum: "مِفْعَلٌ" | "مِفْعَالٌ" | "مِفْعَلَةٌ" | "Tidak Ada" | undefined = undefined;
  if (polaAlat === "Tidak Ada") polaAlatEnum = "Tidak Ada";

  try {
    const lazim = polaAlat === "Tidak Ada";
    const detail = generateSemuaTasrifDetail(
      akarKata,
      indonesian,
      parsedBab as any,
      masdar,
      { polaAlat: polaAlatEnum, lazim }
    );
    
    const artiData = generateArtiPerShighot(indonesian, { lazim });
    return { ...detail, artiData };
  } catch (err) {
    console.error("Error calculating Shorof", err);
    return null;
  }
}

export async function saveMufrodat(data: any) {
  try {
    await prisma.word.create({
      data: {
        rootWord: data.rootWord,
        indonesian: data.indonesian,
        bab: data.bab,
        bina: data.bina,
        transitive: data.transitive || "Muta'addi",
        jenisFiil: data.jenisFiil || "Tsulatsi Mujarrod",
        madhi: data.madhi,
        mudhari: data.mudhari,
        masdar: Array.isArray(data.masdar) ? data.masdar : data.masdar ? [data.masdar] : [],
        masdarMim: data.masdarMim,
        faail: data.faail,
        mafuul: data.mafuul,
        amr: data.amr,
        nahyi: data.nahyi,
        zamanMakan: data.zamanMakan,
        alaat: data.alaat,
        
        wazanMasdar: Array.isArray(data.wazanMasdar) ? data.wazanMasdar : data.wazanMasdar ? [data.wazanMasdar] : [],
        wazanZamanMakan: data.wazanZamanMakan,
        wazanAlaat: data.wazanAlaat,

        artiMadhi: data.artiMadhi,
        artiMudhari: data.artiMudhari,
        artiMasdar: Array.isArray(data.artiMasdar) ? data.artiMasdar : data.artiMasdar ? [data.artiMasdar] : [],
        artiMasdarMim: data.artiMasdarMim,
        artiFaail: data.artiFaail,
        artiMafuul: data.artiMafuul,
        artiAmr: data.artiAmr,
        artiNahyi: data.artiNahyi,
        artiZamanMakan: data.artiZamanMakan,
        artiAlaat: data.artiAlaat,
      },
    });
    revalidatePath("/admin/mufrodat");
    return { success: true };
  } catch (error) {
    console.error("Save error:", error);
    return { success: false, error: "Gagal menyimpan data." };
  }
}

export async function updateMufrodat(id: string, data: any) {
  try {
    await prisma.word.update({
      where: { id },
      data: {
        rootWord: data.rootWord,
        indonesian: data.indonesian,
        bab: data.bab,
        bina: data.bina,
        transitive: data.transitive || "Muta'addi",
        jenisFiil: data.jenisFiil || "Tsulatsi Mujarrod",
        madhi: data.madhi,
        mudhari: data.mudhari,
        masdar: Array.isArray(data.masdar) ? data.masdar : data.masdar ? [data.masdar] : [],
        masdarMim: data.masdarMim,
        faail: data.faail,
        mafuul: data.mafuul,
        amr: data.amr,
        nahyi: data.nahyi,
        zamanMakan: data.zamanMakan,
        alaat: data.alaat,

        wazanMasdar: Array.isArray(data.wazanMasdar) ? data.wazanMasdar : data.wazanMasdar ? [data.wazanMasdar] : [],
        wazanZamanMakan: data.wazanZamanMakan,
        wazanAlaat: data.wazanAlaat,

        artiMadhi: data.artiMadhi,
        artiMudhari: data.artiMudhari,
        artiMasdar: Array.isArray(data.artiMasdar) ? data.artiMasdar : data.artiMasdar ? [data.artiMasdar] : [],
        artiMasdarMim: data.artiMasdarMim,
        artiFaail: data.artiFaail,
        artiMafuul: data.artiMafuul,
        artiAmr: data.artiAmr,
        artiNahyi: data.artiNahyi,
        artiZamanMakan: data.artiZamanMakan,
        artiAlaat: data.artiAlaat,
      },
    });
    revalidatePath("/admin/mufrodat");
    return { success: true };
  } catch (error) {
    console.error("Update error:", error);
    return { success: false, error: "Gagal memperbarui data." };
  }
}

export async function deleteMufrodat(id: string) {
  try {
    await prisma.word.delete({ where: { id } });
    revalidatePath("/admin/mufrodat");
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "Gagal menghapus data." };
  }
}
