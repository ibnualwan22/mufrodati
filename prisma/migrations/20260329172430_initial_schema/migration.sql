-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "rootWord" TEXT NOT NULL,
    "indonesian" TEXT NOT NULL,
    "bab" TEXT,
    "bina" TEXT,
    "transitive" TEXT,
    "jenisFiil" TEXT,
    "madhi" TEXT NOT NULL,
    "mudhari" TEXT NOT NULL,
    "masdar" TEXT NOT NULL,
    "masdarMim" TEXT,
    "faail" TEXT NOT NULL,
    "mafuul" TEXT,
    "amr" TEXT NOT NULL,
    "nahyi" TEXT NOT NULL,
    "zamanMakan" TEXT NOT NULL,
    "alaat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_madhi_bab_key" ON "Word"("madhi", "bab");
