import Link from "next/link";
import { getVerifikasiList, getStats, verifikasiItem, verifikasiBatch } from "./actions";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Verifikasi Data Sima'i | Admin",
};

async function verifikasiAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const aksi = formData.get("aksi") as "VERIFIED" | "REJECTED";
  const catatan = formData.get("catatan") as string;
  await verifikasiItem(id, aksi, catatan || undefined);
}

async function verifikasiBatchAction(formData: FormData) {
  "use server";
  const batchId = formData.get("batchId") as string;
  await verifikasiBatch(batchId);
}

export default async function VerifikasiPage(props: {
  searchParams: Promise<{ page?: string; batch?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const batch = searchParams.batch || "Semua";
  const status = searchParams.status || "AI_DONE";

  const { data: items, total, totalPages, batches } = await getVerifikasiList(page, 10, batch, status);
  const stats = await getStats();

  const statusList = [
    { key: "DRAFT", label: "Draft", value: stats.draft, color: "bg-slate-100 dark:bg-slate-800" },
    { key: "AI_DONE", label: "Menunggu Verifikasi", value: stats.aiDone, color: "bg-yellow-100 dark:bg-yellow-900" },
    { key: "VERIFIED", label: "Terverifikasi", value: stats.verified, color: "bg-green-100 dark:bg-green-900" },
    { key: "REJECTED", label: "Ditolak", value: stats.rejected, color: "bg-red-100 dark:bg-red-900" },
    { key: "PUBLISHED", label: "Published", value: stats.published, color: "bg-blue-100 dark:bg-blue-900" },
  ];

  const buildUrl = (s: string, b: string = batch, p: number = 1) => {
    let url = `/admin/verifikasi?status=${s}`;
    if (b !== "Semua") url += `&batch=${b}`;
    if (p > 1) url += `&page=${p}`;
    return url;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifikasi Data Sima'i</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Cek hasil AI enrichment sebelum masuk ke database utama.
        </p>
      </div>

      {/* Statistik — klik untuk filter */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusList.map((s) => (
          <Link
            key={s.key}
            href={buildUrl(s.key)}
            className={`rounded-lg p-4 ${s.color} ${status === s.key ? "ring-2 ring-blue-600" : "hover:opacity-80"} cursor-pointer`}
          >
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Filter batch */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-500">Batch:</span>
        <Link
          href={buildUrl(status, "Semua")}
          className={`px-3 py-1 rounded-full text-sm ${batch === "Semua" ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
        >
          Semua
        </Link>
        {batches.map((b) => (
          <Link
            key={b}
            href={buildUrl(status, b)}
            className={`px-3 py-1 rounded-full text-sm ${batch === b ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
          >
            {b}
          </Link>
        ))}
      </div>

      {/* Verifikasi batch sekaligus — hanya untuk AI_DONE */}
      {status === "AI_DONE" && batch !== "Semua" && total > 0 && (
        <form action={verifikasiBatchAction} className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <input type="hidden" name="batchId" value={batch} />
          <p className="text-sm flex-1">
            Verifikasi semua <strong>{total}</strong> item dalam batch <strong>{batch}</strong> sekaligus?
          </p>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            ✓ Verifikasi Semua
          </button>
        </form>
      )}

      {/* Daftar item */}
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-slate-500 text-center py-8">
            Tidak ada data dengan status {status === "DRAFT" ? "Draft" : status === "AI_DONE" ? "menunggu verifikasi" : status.toLowerCase()}. 🎉
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold" dir="rtl">{item.madhi}</div>
                <div className="text-sm text-slate-500">
                  {item.rootWord} • {item.bab} • {item.transitive} • Batch: {item.batchId}
                </div>
                {item.aiConfidence !== null && (
                  <div className="text-xs mt-1">
                    <span className={`px-2 py-0.5 rounded-full ${
                      (item.aiConfidence ?? 0) < 0.7
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}>
                      AI confidence: {Math.round((item.aiConfidence ?? 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Data hasil AI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><span className="text-slate-500">Arti:</span> {item.indonesian || "-"}</div>
              <div><span className="text-slate-500">Mudhari:</span> <span dir="rtl">{item.mudhari || "-"}</span></div>
              <div><span className="text-slate-500">Masdar:</span> <span dir="rtl">{(item.masdar || []).join(", ") || "-"}</span></div>
              <div><span className="text-slate-500">Bina:</span> {item.bina || "-"}</div>
              <div><span className="text-slate-500">Fa'il:</span> <span dir="rtl">{item.faail || "-"}</span></div>
              <div><span className="text-slate-500">Maf'ul:</span> <span dir="rtl">{item.mafuul || "-"}</span></div>
              <div><span className="text-slate-500">Amr:</span> <span dir="rtl">{item.amr || "-"}</span></div>
              <div><span className="text-slate-500">Nahyi:</span> <span dir="rtl">{item.nahyi || "-"}</span></div>
            </div>

            {item.aiNotes && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Catatan AI: {item.aiNotes}
              </p>
            )}

            {/* Tombol aksi */}
            <form action={verifikasiAction} className="flex gap-2 items-center pt-2 border-t">
              <input type="hidden" name="id" value={item.id} />
              <input
                type="text"
                name="catatan"
                placeholder="Catatan (opsional)"
                className="flex-1 px-3 py-1.5 border rounded-md text-sm dark:bg-slate-800 dark:border-slate-700"
              />
              <button
                type="submit"
                name="aksi"
                value="VERIFIED"
                className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                ✓ Setuju
              </button>
              <button
                type="submit"
                name="aksi"
                value="REJECTED"
                className="px-4 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                ✗ Tolak
              </button>
            </form>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildUrl(status, batch, p)}
              className={`px-3 py-1 rounded-md text-sm ${p === page ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
