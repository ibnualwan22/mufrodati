"use client";

import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [shighot, setShighot] = useState<string | null>(null);
  const [ilalFromSearch, setIlalFromSearch] = useState<any>(null);
  const [tasrifDetail, setTasrifDetail] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

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
    } catch (err) {
      console.error(err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

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
            {/* Decorative Arabic opener */}
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

            {/* Rule */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
              <span
                style={{
                  fontSize: "0.6rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#3a3020",
                }}
              >
                ◆
              </span>
              <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
            </div>
          </>
        )}

        {/* Title */}
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

      {/* ── Search ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "0 2rem",
          marginBottom: isHero ? "0" : "2rem",
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
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dir="auto"
            placeholder="Masukkan kata Arab atau Indonesia…"
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

        {/* Thin gold accent below search when hero */}
        {isHero && (
          <div
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, #3a3020 50%, transparent)",
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
      `}</style>
    </main>
  );
}