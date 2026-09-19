"use client";

import React from "react";

export default function DeleteButton({ id }: { id: string }) {
  return (
    <button
      type="submit"
      title="Hapus Mufrodat"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-600 text-slate-500 h-8 px-3 border border-transparent"
      onClick={(e) => {
        if (!confirm("Yakin ingin menghapus mufrodat ini?")) {
          e.preventDefault();
        }
      }}
    >
      Hapus
    </button>
  );
}
