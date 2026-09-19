"use client";

import React, { useState, useEffect } from "react";
import { calculateShorofPreview, saveMufrodat, updateMufrodat } from "../actions";
import { useRouter } from "next/navigation";
import { terapkanIlalMasdar } from "@/lib/shorof/ilalEngine";

// Definisi field-field shighot dan properties terkait arti & wazan override
const SHIGHOT_CONFIG = [
  { key: "madhi", label: "Fi'il Madhi", hasArti: true },
  { key: "mudhari", label: "Fi'il Mudhari'", hasArti: true },
  { key: "masdar", label: "Masdar", hasArti: true, isArray: true, hasWazanOverride: true },
  { key: "masdarMim", label: "Masdar Mim", hasArti: true },
  { key: "faail", label: "Isim Fa'il", hasArti: true },
  { key: "mafuul", label: "Isim Maf'ul", hasArti: true },
  { key: "amr", label: "Fi'il Amr", hasArti: true },
  { key: "nahyi", label: "Fi'il Nahyi", hasArti: true },
  { key: "zamanMakan", label: "Isim Zaman/Makan", hasArti: true, hasWazanOverride: true },
  { key: "alaat", label: "Isim Alat", hasArti: true },
];

const WAZAN_MASDAR_OPTIONS = [
  "فَعْلٌ", "فُعُولٌ", "فِعَالٌ", "فَعَالٌ", "فَعَالَةٌ", "فِعْلَةٌ", "فُعْلَةٌ", "فَعِيلٌ", "فَعَلٌ", "فُعَالٌ"
];

export default function MufrodatForm({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  
  // Format awal untuk masdar array
  const initMasdar = initialData?.masdar ? (Array.isArray(initialData.masdar) ? initialData.masdar : [initialData.masdar]) : [""];
  const initWazanMasdar = initialData?.wazanMasdar ? (Array.isArray(initialData.wazanMasdar) ? initialData.wazanMasdar : [initialData.wazanMasdar]) : [""];
  const initArtiMasdar = initialData?.artiMasdar ? (Array.isArray(initialData.artiMasdar) ? initialData.artiMasdar : [initialData.artiMasdar]) : [""];
  
  // State form utama
  const [formData, setFormData] = useState({
    rootWord: initialData?.rootWord || "",
    indonesian: initialData?.indonesian || "",
    bab: initialData?.bab || "Bab 1",
    bina: initialData?.bina || "",
    transitive: initialData?.transitive || "Muta'addi",
    jenisFiil: initialData?.jenisFiil || "Tsulatsi Mujarrod",
    polaAlat: initialData?.wazanAlaat || "mif'alun", 
    
    // Tasrif
    madhi: initialData?.madhi || "",
    mudhari: initialData?.mudhari || "",
    masdar: initMasdar,
    masdarMim: initialData?.masdarMim || "",
    faail: initialData?.faail || "",
    mafuul: initialData?.mafuul || "",
    amr: initialData?.amr || "",
    nahyi: initialData?.nahyi || "",
    zamanMakan: initialData?.zamanMakan || "",
    alaat: initialData?.alaat || "",
    
    // Wazan Override
    wazanMasdar: initWazanMasdar,
    wazanZamanMakan: initialData?.wazanZamanMakan || "",
    wazanAlaat: initialData?.wazanAlaat || "mif'alun",
    
    // Arti Override
    artiMadhi: initialData?.artiMadhi || "",
    artiMudhari: initialData?.artiMudhari || "",
    artiMasdar: initArtiMasdar,
    artiMasdarMim: initialData?.artiMasdarMim || "",
    artiFaail: initialData?.artiFaail || "",
    artiMafuul: initialData?.artiMafuul || "",
    artiAmr: initialData?.artiAmr || "",
    artiNahyi: initialData?.artiNahyi || "",
    artiZamanMakan: initialData?.artiZamanMakan || "",
    artiAlaat: initialData?.artiAlaat || "",
  });

  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openIlal, setOpenIlal] = useState<string | null>(null);

  // Mengambil data Shorof & Arti berdasarkan input saat ini
  useEffect(() => {
    async function fetchPreview() {
      if (formData.rootWord.length >= 3) {
        setLoadingPreview(true);
        // Kita berikan masdar utama sebagai sampel ke shorof generator
        const sampleMasdar = formData.masdar[0] || "";
        const data = await calculateShorofPreview(formData.rootWord, formData.bab, formData.indonesian, sampleMasdar, formData.polaAlat);
        setPreviewData(data);
        if (data && data.bina && (!initialData || formData.rootWord !== initialData.rootWord)) {
          setFormData((prev) => ({ ...prev, bina: data.bina }));
        }
        setLoadingPreview(false);
      } else {
        setPreviewData(null);
      }
    }
    const timeoutId = setTimeout(fetchPreview, 400);
    return () => clearTimeout(timeoutId);
  }, [formData.rootWord, formData.bab, formData.polaAlat, formData.indonesian]); // indonesian men-trigger ulang karena butuh auto-arti

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleMasdarChange = (index: number, field: "masdar" | "wazanMasdar" | "artiMasdar", value: string) => {
    setFormData((prev) => {
      const arr = [...(prev as any)[field]];
      arr[index] = value;

      // Auto-generate masdar word when wazan string is manually typed or picked from dropdown
      const isAutoFillPossible = field === "wazanMasdar" && value.length > 2 && prev.rootWord.trim().length >= 3;
      if (isAutoFillPossible) {
        const rootChars = prev.rootWord.replace(/\s/g, '').split('');
        if (rootChars.length >= 3) {
          const generatedLafadz = value
            .replace('ف', rootChars[0])
            .replace('ع', rootChars[1])
            .replace('ل', rootChars[2]);
            
          const masdarArr = [...prev.masdar];
          const finalMasdar = terapkanIlalMasdar(generatedLafadz, prev.bina);
          masdarArr[index] = finalMasdar; // always overwrite for immediate feedback
          return { ...prev, [field]: arr, masdar: masdarArr };
        }
      }

      return { ...prev, [field]: arr };
    });
  };

  const addMasdar = () => {
    if (formData.masdar.length >= 4) return;
    setFormData((prev) => ({
      ...prev,
      masdar: [...prev.masdar, ""],
      wazanMasdar: [...prev.wazanMasdar, ""],
      artiMasdar: [...prev.artiMasdar, previewData?.artiData?.artiMasdar?.[0] || ""]
    }));
  };
  
  const removeMasdar = (index: number) => {
    if (formData.masdar.length <= 1) return;
    setFormData((prev) => {
      const nm = [...prev.masdar]; nm.splice(index, 1);
      const nw = [...prev.wazanMasdar]; nw.splice(index, 1);
      const na = [...prev.artiMasdar]; na.splice(index, 1);
      return { ...prev, masdar: nm, wazanMasdar: nw, artiMasdar: na };
    });
  };

  const handleApplyAll = (overwrite: boolean) => {
    if (!previewData) return;
    const updates: any = {};
    SHIGHOT_CONFIG.forEach((conf) => {
      // 1. Terapkan Tasrif Arab
      if (conf.isArray) {
        // Khusus masdar
        const suggested = previewData[conf.key]?.hasilAkhir;
        if (suggested) {
          if (overwrite || !formData.masdar[0]) updates.masdar = [suggested];
        }
      } else {
        const suggested = previewData[conf.key]?.hasilAkhir;
        if (suggested) {
          if (overwrite || !(formData as any)[conf.key]) {
            updates[conf.key] = suggested;
          }
        } else if (previewData[conf.key] === null) {
          if (overwrite || !(formData as any)[conf.key]) updates[conf.key] = "";
        }
      }
      
      // 2. Terapkan Wazan (Jika Engine mengeluarkan default wazan yg bisa dioverride)
      if (conf.hasWazanOverride) {
        if (conf.key === "zamanMakan" && previewData.wazanTemplate?.zamanMakan) {
          if (overwrite || !formData.wazanZamanMakan) updates.wazanZamanMakan = previewData.wazanTemplate?.zamanMakan;
        }
        // wazanMasdar tidak kita overwrite otomatis krn variannya banyak, admin pilih di UI
      }
      
      // 3. Terapkan Arti
      if (conf.hasArti && previewData.artiData) {
        const artiKey = `arti${conf.key.charAt(0).toUpperCase() + conf.key.slice(1)}`;
        if (conf.isArray) {
           const sugArti = previewData.artiData[artiKey]?.[0];
           if (sugArti && (overwrite || !formData.artiMasdar[0])) updates.artiMasdar = [sugArti];
        } else {
           const sugArti = previewData.artiData[artiKey];
           if (sugArti !== undefined && sugArti !== null) {
             if (overwrite || !(formData as any)[artiKey]) updates[artiKey] = sugArti;
           } else if (sugArti === null) {
             if (overwrite || !(formData as any)[artiKey]) updates[artiKey] = "";
           }
        }
      }
    });
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleApplySingle = (key: string, isArray: boolean = false) => {
    if (!previewData) return;
    
    // Grab tasrif
    const suggested = previewData[key]?.hasilAkhir;
    if (suggested) {
      if (isArray) {
        handleMasdarChange(0, "masdar", suggested);
      } else {
        setFormData((prev) => ({ ...prev, [key]: suggested }));
      }
    }
    
    // Grab arti
    const artiKey = `arti${key.charAt(0).toUpperCase() + key.slice(1)}`;
    const sugArti = previewData.artiData?.[artiKey];
    if (sugArti) {
       if (isArray) {
         handleMasdarChange(0, "artiMasdar", Array.isArray(sugArti) ? sugArti[0] : sugArti);
       } else {
         setFormData((prev) => ({ ...prev, [artiKey]: sugArti }));
       }
    }
  };

  const isBabBesar = parseInt(formData.bab.replace(/\D/g, "") || "1") > 3;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Jika bab > 3, reset alaat ke null
    const submitData = { ...formData };
    if (isBabBesar) {
      submitData.polaAlat = "Tidak Ada";
      submitData.alaat = "";
      submitData.artiAlaat = "";
    }
    submitData.wazanAlaat = submitData.polaAlat;

    const action = initialData ? updateMufrodat.bind(null, initialData.id) : saveMufrodat;
    const res = await action(submitData);
    setSaving(false);
    if (res.success) {
      router.push("/admin/mufrodat");
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-slate-900 dark:text-slate-100">
      <h1 className="text-2xl font-bold tracking-tight mb-6 flex items-center justify-between">
        <span>{initialData ? "Edit Kosakata" : "Tambah Kosakata Baru"}</span>
        <button
           type="button"
           onClick={() => router.back()}
           className="text-sm font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
        >
          Kembali
        </button>
      </h1>

      <form onSubmit={onSubmit} className="space-y-8">
        
        {/* ── BAGIAN INFORMASI DASAR ── */}
        <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 rounded-lg border border-slate-100 dark:border-slate-800 shadow-inner">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Informasi & Arti Dasar</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Akar Kata <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                name="rootWord"
                dir="rtl"
                className="w-full text-2xl font-arabic px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                placeholder="ص و م"
                value={formData.rootWord}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Arti Dasar (Indonesia) <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                name="indonesian"
                className="w-full text-lg px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                placeholder="Contoh: berpuasa"
                value={formData.indonesian}
                onChange={handleChange}
                title="Arti ini akan otomatis memancing auto-generate arti shighot turunan (Isim Fa'il, Amr, dll)"
              />
            </div>

            <div className="space-y-2 lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Bab Fi'il <span className="text-red-500">*</span></label>
              <select
                name="bab"
                className="w-full px-3 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.bab}
                onChange={handleChange}
              >
                <option value="Bab 1">Bab 1 (فَعَلَ - يَفْعُلُ)</option>
                <option value="Bab 2">Bab 2 (فَعَلَ - يَفْعِلُ)</option>
                <option value="Bab 3">Bab 3 (فَعَلَ - يَفْعَلُ)</option>
                <option value="Bab 4">Bab 4 (فَعِلَ - يَفْعَلُ)</option>
                <option value="Bab 5">Bab 5 (فَعُلَ - يَفْعُلُ)</option>
                <option value="Bab 6">Bab 6 (فَعِلَ - يَفْعِلُ)</option>
              </select>
            </div>

            {/* Isim Alat hanya Bab 1-3 */}
            {!isBabBesar && (
              <div className="space-y-2 lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pola Isim Alat</label>
                <select
                  name="polaAlat"
                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-arabic border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500"
                  value={formData.polaAlat}
                  onChange={handleChange}
                >
                  <option value="mif'alun">مِفْعَلٌ</option>
                  <option value="mif'aalun">مِفْعَالٌ</option>
                  <option value="mif'alatun">مِفْعَلَةٌ</option>
                  <option value="Tidak Ada">Tidak Ada</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold text-blue-900 dark:text-blue-300">Bina':</span>{" "}
              <span className="text-blue-800 dark:text-blue-100">{formData.bina || (loadingPreview ? "Mendeteksi..." : "-")}</span>
              <span className="mx-2 text-blue-300 dark:text-slate-700">|</span>
              <span className="font-semibold text-blue-900 dark:text-blue-300">Wazan Aktif:</span>{" "}
              <span className="text-blue-800 dark:text-blue-100 font-arabic text-lg">{previewData?.wazanInfo || "-"}</span>
            </div>
            {loadingPreview && <div className="text-blue-500 dark:text-blue-400 text-sm animate-pulse">Menghitung Shorof & Arti...</div>}
          </div>
        </div>


        {/* ── BAGIAN GENERATOR ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Konjugasi & Arti Turunan
            </h2>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button
                type="button"
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded font-medium border border-slate-300 dark:border-slate-700 transition-colors"
                onClick={() => handleApplyAll(false)}
                disabled={!previewData}
              >
                + Isi yang Kosong Saja
              </button>
              <button
                type="button"
                className="text-xs shadow-sm shadow-amber-900/10 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900 dark:to-orange-900 hover:from-amber-200 hover:to-amber-100 dark:hover:from-amber-800 dark:hover:to-orange-800 text-amber-900 dark:text-amber-50 px-3 py-1.5 rounded font-medium border border-amber-300 dark:border-amber-700 transition-colors"
                onClick={() => {
                  if (confirm("Ini akan menimpa seluruh field Lafadz TASRIF dan ARTI sesuai dengan rekomendasi Engine! Lanjutkan?")) {
                    handleApplyAll(true);
                  }
                }}
                disabled={!previewData}
              >
                ⚡ Generate Semua (Timpa)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {SHIGHOT_CONFIG.map((conf) => {
              // Jika alat tapi bab > 3, skip render
              if (conf.key === "alaat" && isBabBesar) return null;

              const suggested = previewData?.[conf.key];
              const logIlal = suggested?.ilal && suggested.ilal.length > 0 && suggested.ilal[0].logProses ? suggested.ilal[0].logProses : [];
              
              const isArray = !!conf.isArray;
              const artiKey = `arti${conf.key.charAt(0).toUpperCase() + conf.key.slice(1)}`;
              
              // Cek ada perbedaan?
              const currentLafadz = isArray ? formData.masdar.join(",") : (formData as any)[conf.key];
              const suggestedLafadz = suggested?.hasilAkhir || "";
              const hasDiffLafadz = suggestedLafadz && currentLafadz !== suggestedLafadz;

              return (
                <div key={conf.key} className="space-y-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  
                  {/* Header per field */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 -mx-3 -mt-3 p-3 rounded-t-lg border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{conf.label}</label>
                      {previewData?.wazanTemplate?.[conf.key] && (
                        <span className="font-arabic text-xs text-amber-700 dark:text-amber-500 opacity-70">
                          {previewData.wazanTemplate[conf.key]}
                        </span>
                      )}
                    </div>
                    {hasDiffLafadz && (
                      <button
                        type="button"
                        onClick={() => handleApplySingle(conf.key, isArray)}
                        title="Terapkan hasil mesin untuk kolom ini beserta artinya"
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded px-2 py-1 flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                      >
                        <span className="text-[10px]">🪄</span> <span className="font-arabic">{suggestedLafadz.split("/")[0]}</span>
                      </button>
                    )}
                  </div>

                  {/* Isi Konten Input */}
                  
                  {/* 1. KASUS MASDAR (Dynamic Array) */}
                  {isArray && conf.key === "masdar" ? (
                    <div className="space-y-3 pt-2">
                       {formData.masdar.map((mItem: string, idx: number) => (
                         <div key={idx} className="flex flex-col gap-2 p-2 border border-slate-100 dark:border-slate-700 rounded-md relative group">
                            <div className="flex gap-2">
                              <input
                                 type="text"
                                 dir="rtl"
                                 placeholder="Lafadz Masdar"
                                 className="flex-1 text-xl font-arabic px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500"
                                 value={mItem}
                                 onChange={(e) => handleMasdarChange(idx, "masdar", e.target.value)}
                              />
                              <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden text-xs">
                                 <select
                                   className="w-16 px-1 appearance-none outline-none font-arabic bg-transparent text-slate-900 dark:text-slate-100 text-center border-r border-slate-200 dark:border-slate-600"
                                   value={formData.wazanMasdar[idx]}
                                   onChange={(e) => handleMasdarChange(idx, "wazanMasdar", e.target.value)}
                                   title="Pilih Wazan Master (Opsional)"
                                 >
                                    <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" value="">Wazan?</option>
                                    {WAZAN_MASDAR_OPTIONS.map(opt => <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" key={opt} value={opt}>{opt}</option>)}
                                 </select>
                                 <input
                                   className="w-20 px-2 outline-none bg-transparent placeholder-slate-400 text-slate-900 dark:text-slate-100"
                                   placeholder="Wazan Text"
                                   value={formData.wazanMasdar[idx]}
                                   onChange={(e) => handleMasdarChange(idx, "wazanMasdar", e.target.value)}
                                 />
                              </div>
                            </div>
                            <input 
                              type="text"
                              placeholder="Arti spesifik masdar ini (opsional)..."
                              className="w-full text-xs text-slate-600 dark:text-slate-300 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-600 rounded"
                              value={formData.artiMasdar[idx]}
                              onChange={(e) => handleMasdarChange(idx, "artiMasdar", e.target.value)}
                            />
                            {formData.masdar.length > 1 && (
                               <button type="button" onClick={() => removeMasdar(idx)} className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            )}
                         </div>
                       ))}
                       {formData.masdar.length < 4 && (
                         <button type="button" onClick={addMasdar} className="text-xs text-blue-600 hover:text-blue-800">+ Tambah Masdar Lainnya</button>
                       )}
                    </div>
                  ) : (
                  
                  /* 2. KASUS LAINNYA (Tunggal) */
                    <div className="space-y-1.5 pt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name={conf.key}
                          dir="rtl"
                          placeholder={`Lafadz ${conf.label}`}
                          className="flex-1 text-xl font-arabic px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500"
                          value={(formData as any)[conf.key]}
                          onChange={handleChange}
                        />
                        {/* Wazan Override utk Zaman Makan */}
                        {conf.key === "zamanMakan" &&(
                           <input
                              type="text"
                              name="wazanZamanMakan"
                              dir="rtl"
                              placeholder="Wazan Zaman/Makan"
                              title="Override wazan jika beda dari Masdar Mim"
                              className="w-24 text-lg font-arabic px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500"
                              value={formData.wazanZamanMakan}
                              onChange={handleChange}
                           />
                        )}
                      </div>
                      
                      {conf.hasArti && (
                         <input
                           type="text"
                           name={artiKey}
                           placeholder={`Arti / Makna ${conf.label}...`}
                           className="w-full text-sm text-slate-700 dark:text-slate-300 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-blue-500 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900"
                           value={(formData as any)[artiKey]}
                           onChange={handleChange}
                         />
                      )}
                    </div>
                  )}

                  {/* LOG I'LAL */}
                  {logIlal.length > 0 && conf.key !== "masdar" && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenIlal(openIlal === conf.key ? null : conf.key)}
                        className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
                      >
                        {openIlal === conf.key ? "Sembunyikan I'lal ▲" : "Tampilkan I'lal ▼"}
                      </button>
                      {openIlal === conf.key && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded text-sm text-slate-600 dark:text-slate-400 space-y-2 text-left">
                          <p className="font-semibold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 pb-1">Kaidah I'lal yang Bekerja</p>
                          <ul className="list-decimal pl-4 space-y-2 text-xs">
                            {logIlal.map((log: any, idx: number) => (
                              <li key={idx}>
                                {log.pesan}
                                <br />
                                <span className="font-arabic text-base text-teal-700 dark:text-teal-500" dir="rtl">{log.hasilSementara}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-4 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-b-xl shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {saving ? "Menyimpan Data..." : (initialData ? "Simpan Perbaikan" : "Simpan Mufrodat Baru")}
          </button>
        </div>
      </form>
    </div>
  );
}
