/**
 * app/admin/verifikasi/actions.ts
 * Server actions untuk halaman verifikasi data sima'i
 */
"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function getVerifikasiList(
  page: number = 1,
  perPage: number = 10,
  batchId?: string,
  status: string = "AI_DONE"
) {
  const where: any = { status };
  if (batchId && batchId !== "Semua") where.batchId = batchId;

  const total = await prisma.simaIImport.count({ where });
  const data = await prisma.simaIImport.findMany({
    where,
    orderBy: [
      { aiConfidence: "asc" }, // Prioritas: confidence rendah dulu
      { createdAt: "asc" },
    ],
    skip: (page - 1) * perPage,
    take: perPage,
  });

  const batches = await prisma.simaIImport.findMany({
    select: { batchId: true },
    distinct: ["batchId"],
    orderBy: { batchId: "desc" },
  });

  return {
    data,
    total,
    totalPages: Math.ceil(total / perPage),
    batches: batches.map((b) => b.batchId),
  };
}

export async function verifikasiItem(id: string, aksi: "VERIFIED" | "REJECTED", catatan?: string) {
  await prisma.simaIImport.update({
    where: { id },
    data: {
      status: aksi,
      verifiedAt: new Date(),
      verifierNotes: catatan || null,
      // TODO: verifiedBy dari session user
    },
  });
  revalidatePath("/admin/verifikasi");
}

export async function verifikasiBatch(batchId: string) {
  // Verifikasi semua AI_DONE dalam satu batch sekaligus
  const result = await prisma.simaIImport.updateMany({
    where: { batchId, status: "AI_DONE" },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });
  revalidatePath("/admin/verifikasi");
  return result.count;
}

export async function updateItem(id: string, data: Record<string, any>) {
  // Edit field sebelum verifikasi
  const allowed = [
    "rootWord", "indonesian", "bab", "bina", "transitive", "jenisFiil",
    "madhi", "mudhari", "masdar", "masdarMim", "faail", "mafuul",
    "amr", "nahyi", "zamanMakan", "alaat",
  ];
  const filtered: Record<string, any> = {};
  for (const key of allowed) {
    if (key in data) filtered[key] = data[key];
  }

  await prisma.simaIImport.update({
    where: { id },
    data: filtered,
  });
  revalidatePath("/admin/verifikasi");
}

export async function getStats() {
  const [draft, aiDone, verified, rejected, published] = await Promise.all([
    prisma.simaIImport.count({ where: { status: "DRAFT" } }),
    prisma.simaIImport.count({ where: { status: "AI_DONE" } }),
    prisma.simaIImport.count({ where: { status: "VERIFIED" } }),
    prisma.simaIImport.count({ where: { status: "REJECTED" } }),
    prisma.simaIImport.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { draft, aiDone, verified, rejected, published };
}
