"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ResultCard from "@/components/ResultCard";
import { Loader2, Search } from "lucide-react";

type Suggestion = {
  id: string;
  rootWord: string;
  indonesian: string;
  madhi: string;
  mudhari: string;
  masdar: string;
  bab: string | null;
  bina: string | null;
  kolom_cocok: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [shighot, setShighot] = useState<string | null>(null);
  const [ilalFromSearch, setIlalFromSearch] = useState<any>(null);
  const [tasrifDetail, setTasrifDetail] = useState<any>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch suggestions (debounced) ────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setShowSuggestions((data.suggestions ?? []).length > 0);
      setActiveSuggestion(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  // ── Lihat Detail: fetch full result for a suggestion ─────────────────────
  const handleSelectSuggestion = async (s: Suggestion) => {
    setShowSuggestions(false);
    setQuery(s.rootWord); // tampilkan akar kata di input
    setLoading(true);
    setSearched(true);
    setShighot(null);
    setIlalFromSearch(null);
    setResult(null); // reset dulu agar ResultCard re-mount dengan props baru
    try {
      const res = await fetch(`/api/search?id=${encodeURIComponent(s.id)}&q=${encodeURIComponent(s.rootWord)}`);
      const data = await res.json();
      if (data.found && data.word) {
        setResult(data.word);
        setShighot(data.shighot_pencarian ?? null);
        setIlalFromSearch(data.ilal ?? null);
        setTasrifDetail(data.tasrifDetail ?? null);
      } else {
        setResult(null);
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Form submit ────────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    setLoading(true);
    setSearched(true);
    setShighot(null);
    setIlalFromSearch(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.found && data.word) {
        setResult(data.word);
        setShighot(data.shighot_pencarian ?? null);
        setIlalFromSearch(data.ilal ?? null);
        setTasrifDetail(data.tasrifDetail ?? null);
      } else {
        setResult(null);
      }
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // ── Click outside: close dropdown ─────────────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isHero = !searched;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#e8e0d0",
        paddingBottom: "4rem",
      }}
    >
      {/* ── Top rule ── */}
      <div
        style={{
          width: "100%",
          height: "2px",
          background: "linear-gradient(90deg, transparent, #c9a84c 30%, #c9a84c 70%, transparent)",
        }}
      />

      {/* ── Masthead ── */}
      <header
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: isHero ? "5rem 2rem 2.5rem" : "2rem 2rem 1.5rem",
          textAlign: "center",
          transition: "padding 0.5s ease",
        }}
      >
        {isHero && (
          <>
            <div
              dir="rtl"
              style={{
                fontSize: "1.1rem",
                color: "#3a3020",
                letterSpacing: "0.3em",
                marginBottom: "1.5rem",
                fontFamily: "serif",
              }}
            >
              بِسْمِ اللّٰهِ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
              <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#3a3020" }}>◆</span>
              <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
            </div>
          </>
        )}

        <h1
          style={{
            fontSize: isHero ? "clamp(2.5rem, 8vw, 4.5rem)" : "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: "normal",
            letterSpacing: isHero ? "0.15em" : "0.1em",
            textTransform: "uppercase",
            color: "#e8e0d0",
            margin: 0,
            lineHeight: 1,
            transition: "font-size 0.5s ease, letter-spacing 0.5s ease",
          }}
        >
          Kamus{" "}
          <span style={{ color: "#c9a84c" }}>Mufrodati</span>
        </h1>

        {isHero && (
          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              color: "#5a5040",
              textTransform: "uppercase",
              lineHeight: 1.8,
            }}
          >
            Kamus Arab–Indonesia &nbsp;·&nbsp; Tasrif Istilahi &nbsp;·&nbsp; Analisis I'lal
          </p>
        )}

        {isHero && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.75rem" }}>
            <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
            <span style={{ fontSize: "0.6rem", color: "#3a3020" }}>◆</span>
            <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
          </div>
        )}
      </header>

      {/* ── Search + Dropdown wrapper ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "0 2rem",
          marginBottom: isHero ? "0" : "2rem",
          position: "relative",
          zIndex: 100,
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            border: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            background: "#0f0f0f",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            dir="auto"
            placeholder="Masukkan kata Arab atau Indonesia…"
            autoComplete="off"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              padding: "1rem 1.25rem",
              fontSize: "1rem",
              color: "#e8e0d0",
              fontFamily: "'Georgia', serif",
              letterSpacing: "0.03em",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              borderLeft: "1px solid #2a2a2a",
              padding: "1rem 1.5rem",
              cursor: loading ? "not-allowed" : "pointer",
              color: loading ? "#3a3020" : "#c9a84c",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "'Georgia', serif",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? (
              <Loader2
                style={{
                  width: "0.9rem",
                  height: "0.9rem",
                  animation: "spin 1s linear infinite",
                }}
              />
            ) : (
              "Cari"
            )}
          </button>
        </form>

        {/* ── Suggestions Dropdown ── */}
        {showSuggestions && (
          <div
            ref={dropdownRef}
            style={{
              position: "absolute",
              top: "calc(100% - 1px)",
              left: "2rem",
              right: "2rem",
              background: "#0f0f0f",
              border: "1px solid #2a2a2a",
              borderTop: "1px solid #1a1a1a",
              maxHeight: "420px",
              overflowY: "auto",
              zIndex: 100,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {suggestLoading && (
              <div
                style={{
                  padding: "0.85rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  color: "#3a3020",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <Loader2
                  style={{
                    width: "0.75rem",
                    height: "0.75rem",
                    animation: "spin 1s linear infinite",
                    color: "#c9a84c",
                  }}
                />
                Mencari…
              </div>
            )}

            {!suggestLoading &&
              suggestions.map((s, idx) => {
                const isActive = idx === activeSuggestion;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1.25rem",
                      borderBottom:
                        idx < suggestions.length - 1
                          ? "1px solid #161616"
                          : "none",
                      background: isActive ? "#161410" : "transparent",
                      transition: "background 0.15s",
                      gap: "1rem",
                      cursor: "default",
                    }}
                    onMouseEnter={() => setActiveSuggestion(idx)}
                    onMouseLeave={() => setActiveSuggestion(-1)}
                  >
                    {/* Kiri: Arab + Arti */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0 }}>
                      {/* Badge kolom cocok */}
                      <span
                        style={{
                          fontSize: "0.55rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#5a5040",
                          border: "1px solid #2a2420",
                          padding: "0.15rem 0.45rem",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          fontFamily: "'Georgia', serif",
                        }}
                      >
                        {s.kolom_cocok}
                      </span>

                      {/* Lafadz Arab */}
                      <span
                        dir="rtl"
                        style={{
                          fontFamily: "'Amiri', 'Scheherazade New', serif",
                          fontSize: "1.35rem",
                          color: isActive ? "#d4a84c" : "#c9a84c",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "color 0.15s",
                        }}
                      >
                        {s.rootWord}
                      </span>

                      {/* Madhi jika berbeda */}
                      {s.madhi && s.madhi !== s.rootWord && (
                        <span
                          dir="rtl"
                          style={{
                            fontFamily: "'Amiri', serif",
                            fontSize: "1rem",
                            color: "#4a4438",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.madhi}
                        </span>
                      )}

                      {/* Arti Indonesia */}
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: "#7a7060",
                          fontFamily: "'Georgia', serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.indonesian}
                      </span>
                    </div>

                    {/* Kanan: Tombol Lihat Detail */}
                    <button
                      onClick={() => handleSelectSuggestion(s)}
                      style={{
                        background: isActive ? "#1a1408" : "none",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: isActive ? "#c9a84c" : "#3a3020",
                        color: "#c9a84c",
                        fontSize: "0.6rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontFamily: "'Georgia', serif",
                        padding: "0.35rem 0.85rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      Lihat Detail
                    </button>
                  </div>
                );
              })}

            {/* Thin gold accent bawah dropdown */}
            <div
              style={{
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, #c9a84c 40%, #c9a84c 60%, transparent)",
              }}
            />
          </div>
        )}

        {/* Thin gold accent below search when hero */}
        {isHero && (
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, #3a3020 50%, transparent)",
              marginTop: "0",
            }}
          />
        )}
      </div>

      {/* ── Results ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "0 2rem",
          marginTop: "2.5rem",
        }}
      >
        {result && !loading && (
          <ResultCard
            word={result}
            searchQuery={query}
            shighot={shighot}
            ilalPrefetched={ilalFromSearch}
            tasrifDetail={tasrifDetail}
          />
        )}

        {searched && !loading && !result && (
          <div
            style={{
              borderTop: "1px solid #1e1e1e",
              paddingTop: "2.5rem",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#3a3020",
                marginBottom: "0.75rem",
              }}
            >
              Tidak Ditemukan
            </p>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#5a5040",
                fontFamily: "'Georgia', serif",
                fontStyle: "italic",
              }}
            >
              Tidak ada entri untuk &ldquo;{query}&rdquo;. Periksa ejaan dan coba lagi.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {isHero && (
        <footer
          style={{
            marginTop: "auto",
            paddingTop: "4rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#1e1a14",
            }}
          >
            Kamus Mufrodati &nbsp;·&nbsp; Shorof &amp; I'lal
          </p>
        </footer>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::placeholder { color: #3a3020; }
        input:focus { box-shadow: none; }
        
        /* Scrollbar styling for dropdown */
        .suggest-scroll::-webkit-scrollbar { width: 4px; }
        .suggest-scroll::-webkit-scrollbar-track { background: #0f0f0f; }
        .suggest-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; }
      `}</style>
    </main>
  );
}