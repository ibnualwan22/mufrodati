"use client";

import { useState } from "react";
import { Loader2, Info } from "lucide-react";
import IlalModal from "./IlalModal";

type Word = {
  id: string;
  rootWord: string;
  indonesian: string;
  bab?: string | null;
  bina?: string | null;
  madhi: string;
  mudhari: string;
  masdar: string;
  masdarMim?: string | null;
  faail: string;
  mafuul?: string | null;
  amr: string;
  nahyi: string;
  zamanMakan: string;
  alaat?: string | null;
};

const TABS = [
  { id: "detail", label: "Detail" },
  { id: "tasrif", label: "Tasrif" },
  { id: "ilal", label: "I'lal" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ResultCard({
  word,
  searchQuery,
  shighot,
  ilalPrefetched,
  tasrifDetail,
}: {
  word: Word;
  searchQuery: string;
  shighot?: string | null;
  ilalPrefetched?: any;
  tasrifDetail?: any;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("detail");
  // Gunakan data I'lal yang sudah di-fetch dari /api/search, atau fetch saat tab aktif
  const [ilalResult, setIlalResult] = useState<any>(ilalPrefetched ?? null);
  const [ilalLoading, setIlalLoading] = useState(false);
  const [hasAttemptedIlal, setHasAttemptedIlal] = useState(!!ilalPrefetched);
  const [selectedIlal, setSelectedIlal] = useState<{data: any, name: string} | null>(null);

  const fetchIlalAnalysis = async () => {
    if (hasAttemptedIlal) return;
    setIlalLoading(true);
    setHasAttemptedIlal(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kata: searchQuery, akarKata: word.rootWord }),
      });
      const data = await res.json();
      setIlalResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIlalLoading(false);
    }
  };

  if (activeTab === "ilal" && !hasAttemptedIlal && !ilalLoading) {
    fetchIlalAnalysis();
  }

  return (
    <div
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        background: "#0f0f0f",
        border: "1px solid #2a2a2a",
        color: "#e8e0d0",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          padding: "2rem 2.5rem 1.5rem",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1.5rem",
        }}
      >
        {/* Left: root word + translation */}
        <div>
          <div
            dir="rtl"
            style={{
              fontFamily: "'Amiri', 'Scheherazade New', serif",
              fontSize: "clamp(2.5rem, 6vw, 3.75rem)",
              color: "#c9a84c",
              lineHeight: 1.15,
              letterSpacing: "0.02em",
              marginBottom: "0.4rem",
            }}
          >
            {word.rootWord}
          </div>
          <div
            style={{
              fontSize: "0.95rem",
              color: "#8a8070",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "'Georgia', serif",
            }}
          >
            {word.indonesian}
          </div>
        </div>

        {/* Right: badges */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.4rem",
            paddingTop: "0.4rem",
          }}
        >
          {word.bab && (
            <span
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#c9a84c",
                border: "1px solid #3a3020",
                padding: "0.25rem 0.65rem",
                fontFamily: "'Georgia', serif",
              }}
            >
              {word.bab}
            </span>
          )}
          {word.bina && (
            <span
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#7a7060",
                border: "1px solid #222",
                padding: "0.25rem 0.65rem",
                fontFamily: "'Georgia', serif",
              }}
            >
              {word.bina}
            </span>
          )}
          {shighot && (
            <span
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5a8060",
                border: "1px solid #1a2820",
                padding: "0.25rem 0.65rem",
                fontFamily: "'Georgia', serif",
                marginTop: "0.2rem",
              }}
            >
              Bentuk: {shighot}
            </span>
          )}
        </div>
      </header>

      {/* ── Tab Nav ── */}
      <nav
        style={{
          display: "flex",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: isActive ? "2px solid #c9a84c" : "2px solid transparent",
                padding: "0.9rem 1.75rem",
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isActive ? "#c9a84c" : "#5a5040",
                cursor: "pointer",
                fontFamily: "'Georgia', serif",
                transition: "color 0.2s",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Tab Content ── */}
      <div style={{ padding: "2rem 2.5rem", minHeight: "260px" }}>

        {/* ─ Detail ─ */}
        {activeTab === "detail" && (
          <div>
            <Row label="Akar Kata" isArabic value={word.rootWord} />
            <Divider />
            <Row label="Terjemahan" value={word.indonesian} />
            {word.bab && (
              <>
                <Divider />
                <Row label="Bab" value={word.bab} />
              </>
            )}
            {word.bina && (
              <>
                <Divider />
                <Row label="Bina'" value={word.bina} />
              </>
            )}
          </div>
        )}

        {/* ─ Tasrif ─ */}
        {activeTab === "tasrif" && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Amiri', 'Scheherazade New', serif",
                direction: "rtl",
                fontSize: "1.3rem",
                minWidth: "540px",
              }}
            >
              <thead>
                <tr>
                  {[
                    { label: "ماضي", key: "madhi" },
                    { label: "مضارع", key: "mudhari" },
                    { label: "مصدر", key: "masdar" },
                    ...(word.masdarMim ? [{ label: "مصدر ميمي", key: "masdarMim" }] : []),
                    { label: "فاعل", key: "faail" },
                    { label: "مفعول", key: "mafuul" },
                    { label: "أمر", key: "amr" },
                    { label: "نهي", key: "nahyi" },
                    { label: "ظرف", key: "zamanMakan" },
                    ...(word.alaat ? [{ label: "آلة", key: "alaat" }] : []),
                  ].map((col) => (
                    <th
                      key={col.key}
                      style={{
                        padding: "0.6rem 0.75rem",
                        borderBottom: "1px solid #c9a84c",
                        color: "#c9a84c",
                        fontSize: "0.65rem",
                        fontFamily: "'Georgia', serif",
                        fontWeight: "normal",
                        letterSpacing: "0.04em",
                        textAlign: "center",
                        direction: "rtl",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[
                    { val: tasrifDetail?.madhi?.hasilAkhir || word.madhi, ilal: tasrifDetail?.madhi?.ilal, name: "Fi'il Madhi" },
                    { val: tasrifDetail?.mudhari?.hasilAkhir || word.mudhari, ilal: tasrifDetail?.mudhari?.ilal, name: "Fi'il Mudhari'" },
                    { val: tasrifDetail?.masdar?.hasilAkhir || word.masdar, ilal: tasrifDetail?.masdar?.ilal, name: "Masdar" },
                    ...(word.masdarMim ? [{ val: tasrifDetail?.masdarMim?.hasilAkhir || word.masdarMim, ilal: tasrifDetail?.masdarMim?.ilal, name: "Masdar Mim" }] : []),
                    { val: tasrifDetail?.faail?.hasilAkhir || word.faail, ilal: tasrifDetail?.faail?.ilal, name: "Isim Fa'il" },
                    { val: word.mafuul ? (tasrifDetail?.mafuul?.hasilAkhir || word.mafuul) : "—", ilal: tasrifDetail?.mafuul?.ilal, name: "Isim Maf'ul" },
                    { val: tasrifDetail?.amr?.hasilAkhir || word.amr, ilal: tasrifDetail?.amr?.ilal, name: "Fi'il Amr" },
                    { val: tasrifDetail?.nahyi?.hasilAkhir || word.nahyi, ilal: tasrifDetail?.nahyi?.ilal, name: "Fi'il Nahyi" },
                    { val: tasrifDetail?.zamanMakan?.hasilAkhir || word.zamanMakan, ilal: tasrifDetail?.zamanMakan?.ilal, name: "Isim Zaman/Makan" },
                    ...(word.alaat ? [{ val: tasrifDetail?.alaat?.hasilAkhir || word.alaat, ilal: tasrifDetail?.alaat?.ilal, name: "Isim Alat" }] : []),
                  ].map((item, i) => {
                    const hasIlal = item.ilal && item.ilal.length > 0 && 
                      !(item.ilal[0].logProses.length === 0 || 
                       (item.ilal[0].logProses.length === 1 && item.ilal[0].logProses[0].pesan === "tidak ada kaidah i'lal yg berlaku"));
                    
                    return (
                      <td
                        key={i}
                        style={{
                          padding: "1rem 0.75rem",
                          textAlign: "center",
                          color: item.val === "—" ? "#3a3530" : "#e8e0d0",
                          borderBottom: "1px solid #1e1e1e",
                          whiteSpace: "nowrap",
                          position: "relative",
                        }}
                      >
                        {item.val}
                        {hasIlal && item.val !== "—" && (
                          <button
                            onClick={() => setSelectedIlal({ data: item.ilal, name: item.name })}
                            title="Lihat Proses I'lal"
                            style={{
                              marginLeft: "0.5rem",
                              background: "none",
                              border: "none",
                              color: "#c9a84c",
                              cursor: "pointer",
                              padding: "0 0.2rem",
                              verticalAlign: "middle",
                            }}
                          >
                            <Info size={14} />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ─ I'lal ─ */}
        {activeTab === "ilal" && (
          <div>
            {ilalLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "3rem",
                  gap: "1rem",
                  color: "#5a5040",
                }}
              >
                <Loader2
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    animation: "spin 1s linear infinite",
                    color: "#c9a84c",
                  }}
                />
                <span style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Georgia', serif" }}>
                  Menganalisa...
                </span>
              </div>
            )}

            {!ilalLoading && ilalResult && (() => {
              const isFallback =
                ilalResult.logProses?.length === 1 &&
                ilalResult.logProses[0] === "tidak ada kaidah i'lal yg berlaku";

              if (isFallback) {
                // ── Tampilan sederhana jika tidak ada i'lal ──
                return (
                  <div style={{
                    padding: "2rem 0",
                    textAlign: "center",
                  }}>
                    <div style={{
                      display: "inline-block",
                      border: "1px solid #1e1e1e",
                      padding: "1.25rem 2rem",
                    }}>
                      <p style={{
                        fontSize: "0.75rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#4a4438",
                        fontFamily: "'Georgia', serif",
                        fontStyle: "italic",
                        margin: 0,
                      }}>
                        tidak ada kaidah i‘lal yg berlaku
                      </p>
                      <p style={{
                        marginTop: "0.5rem",
                        fontSize: "0.7rem",
                        color: "#3a3020",
                        fontFamily: "'Georgia', serif",
                        margin: "0.5rem 0 0",
                      }}>
                        Bina&rsquo;: {ilalResult.bina}
                      </p>
                    </div>
                  </div>
                );
              }

              // ── Roadmap lengkap jika ada kaidah berlaku ──
              return (
                <div>
                  {/* Kata Diinput */}
                  <div style={{ marginBottom: "1.75rem" }}>
                    <label style={labelStyle}>Kata Diinput</label>
                    <span
                      style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: "2rem",
                        color: "#e8e0d0",
                        display: "block",
                        marginTop: "0.25rem",
                      }}
                      dir="rtl"
                    >
                      {searchQuery}
                    </span>
                  </div>

                  <Divider />

                  {/* Akar Kata */}
                  <div style={{ marginBottom: "1.75rem", marginTop: "1.75rem" }}>
                    <label style={labelStyle}>Asal / Akar Kata</label>
                    <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span
                        style={{ fontFamily: "'Amiri', serif", fontSize: "2rem", color: "#c9a84c" }}
                        dir="rtl"
                      >
                        {word.rootWord}
                      </span>
                      {ilalResult.bina && (
                        <span style={{
                          fontSize: "0.7rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#5a5040",
                          fontFamily: "'Georgia', serif",
                        }}>
                          bina': {ilalResult.bina}
                        </span>
                      )}
                    </div>
                  </div>

                  <Divider />

                  {/* Kaidah */}
                  <div style={{ marginTop: "1.75rem", marginBottom: "1.75rem" }}>
                    <label style={labelStyle}>Kaidah yang Berlaku</label>
                    <ol style={{ margin: "1rem 0 0", padding: 0, listStyle: "none" }}>
                      {ilalResult.logProses.map((log: string, idx: number) => (
                        <li
                          key={idx}
                          style={{
                            display: "flex",
                            gap: "1rem",
                            paddingBottom: "0.85rem",
                            marginBottom: "0.85rem",
                            borderBottom: idx < ilalResult.logProses.length - 1 ? "1px solid #1e1e1e" : "none",
                            alignItems: "flex-start",
                          }}
                        >
                          <span style={{
                            fontSize: "0.65rem",
                            color: "#c9a84c",
                            fontFamily: "'Georgia', serif",
                            letterSpacing: "0.05em",
                            paddingTop: "0.2rem",
                            minWidth: "1.5rem",
                            flexShrink: 0,
                          }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span style={{
                            fontSize: "0.92rem",
                            color: "#b8b0a0",
                            lineHeight: 1.7,
                            fontFamily: "'Georgia', serif",
                          }}>
                            {log}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <Divider />

                  {/* Hasil akhir */}
                  <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={labelStyle}>Hasil Ter-i‘lal</label>
                    <span
                      style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: "2.75rem",
                        color: "#c9a84c",
                        letterSpacing: "0.02em",
                      }}
                      dir="rtl"
                    >
                      {ilalResult.hasilAkhir}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Footer line ── */}
      <div
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "0.75rem 2.5rem",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#2e2820",
            fontFamily: "'Georgia', serif",
          }}
        >
          Kamus Shorof
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Modal I'lal ── */}
      <IlalModal 
        isOpen={!!selectedIlal} 
        onClose={() => setSelectedIlal(null)} 
        data={selectedIlal?.data} 
        shighotName={selectedIlal?.name || ""} 
      />
    </div>
  );
}

/* ── Helpers ── */

function Row({
  label,
  value,
  isArabic,
}: {
  label: string;
  value: string;
  isArabic?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.6rem 0",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#5a5040",
          fontFamily: "'Georgia', serif",
        }}
      >
        {label}
      </span>
      <span
        style={
          isArabic
            ? {
              fontFamily: "'Amiri', 'Scheherazade New', serif",
              fontSize: "1.5rem",
              color: "#c9a84c",
              direction: "rtl",
            }
            : {
              fontSize: "0.92rem",
              color: "#c0b898",
              fontFamily: "'Georgia', serif",
              textAlign: "right",
            }
        }
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid #1e1e1e",
        margin: 0,
      }}
    />
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5a5040",
  fontFamily: "'Georgia', serif",
  display: "block",
};