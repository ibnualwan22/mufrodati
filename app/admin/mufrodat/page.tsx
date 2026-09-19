import Link from 'next/link';
import { getMufrodatList, deleteMufrodat } from './actions';
import { redirect } from 'next/navigation';
import DeleteButton from './components/DeleteButton';

export const metadata = {
  title: 'Manajemen Mufrodat | Admin',
};

async function deleteAction(formData: FormData) {
  "use server";
  const id = formData.get('id') as string;
  await deleteMufrodat(id);
}

const HIJAIYAH = ['Semua', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'و', 'ه', 'ي'];

export default async function AdminMufrodatPage(props: {
  searchParams: Promise<{ page?: string; letter?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const letter = searchParams.letter || "Semua";
  const { data: words, total, totalPages } = await getMufrodatList(page, 20, letter);

  // Pagination generator limited
  const maxPagesToShow = 7;
  let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let endPage = startPage + maxPagesToShow - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  const pagesArr = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Mufrodat</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Total {total} kosakata pada filter ini.
          </p>
        </div>
        <Link
          href="/admin/mufrodat/tambah"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 shadow-sm"
        >
          + Tambah Kosakata
        </Link>
      </div>

      {/* Hijaiyah Filter / Dictionary Index */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 overflow-hidden shadow-sm">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-3">Filter Abjad Hijaiyah</h2>
        <div className="flex flex-wrap gap-1.5 sm:gap-2" dir="rtl">
          {HIJAIYAH.map((h) => {
            const isActive = h === letter;
            return (
              <Link
                key={h}
                href={`/admin/mufrodat?letter=${h}&page=1`}
                className={`
                  flex items-center justify-center min-w-8 h-8 px-2 rounded-md font-arabic text-lg transition-colors border
                  ${isActive 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/30' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}
                `}
              >
                {h}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold text-right" dir="rtl">Asal Kata</th>
                <th className="px-6 py-4 font-semibold">Arti/Terjemahan</th>
                <th className="px-6 py-4 font-semibold">Jenis Bina'</th>
                <th className="px-6 py-4 font-semibold">Bab / Wazan</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {words.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-lg font-medium mb-1">Tidak ada kosakata</p>
                    <p className="text-sm">Silakan buat baru atau ubah filter pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                words.map((word) => (
                  <tr key={word.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-2xl font-bold font-arabic text-amber-900 dark:text-amber-400 text-right" dir="rtl">
                      {word.rootWord}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{word.indonesian}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{word.bina || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{word.bab || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/mufrodat/${word.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 h-8 px-3 border border-slate-200 dark:border-slate-700"
                        >
                          Edit
                        </Link>
                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={word.id} />
                          <DeleteButton id={word.id} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Pagination Navigation */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Halaman <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Link
              href={page > 1 ? `/admin/mufrodat?letter=${letter}&page=${page - 1}` : '#'}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-8 px-3 border ${
                page > 1 
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700' 
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              &laquo; Prev
            </Link>
            
            {startPage > 1 && (
               <span className="inline-flex items-center justify-center text-slate-400 dark:text-slate-600 px-1">...</span>
            )}

            {pagesArr.map((p) => (
              <Link
                key={p}
                href={`/admin/mufrodat?letter=${letter}&page=${p}`}
                className={`min-w-8 h-8 hidden sm:inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${
                  page === p 
                    ? 'bg-blue-600 text-white border-transparent' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </Link>
            ))}

            {endPage < totalPages && (
               <span className="inline-flex items-center justify-center text-slate-400 dark:text-slate-600 px-1">...</span>
            )}

            <Link
              href={page < totalPages ? `/admin/mufrodat?letter=${letter}&page=${page + 1}` : '#'}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-8 px-3 border ${
                page < totalPages 
                  ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700' 
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed'
              }`}
            >
              Next &raquo;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
