import React from "react";
import { X } from "lucide-react";

interface IlalModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // The ilal[] array from tasrifDetail
  shighotName: string;
}

export default function IlalModal({ isOpen, onClose, data, shighotName }: IlalModalProps) {
  if (!isOpen || !data || data.length === 0) return null;

  // Data can be an array of ProsesIlal (e.g. if multiple forms exist). We take the first one for now,
  // or render them sequentially if there are variants.
  const prosesIlal = data[0];

  const hasNoKaidah =
    prosesIlal?.logProses?.length === 0 ||
    (prosesIlal?.logProses?.length === 1 &&
     prosesIlal.logProses[0].pesan === "tidak ada kaidah i'lal yg berlaku");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0f0f0f",
          border: "1px solid #3a3020",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
          color: "#e8e0d0",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #1e1e1e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#0f0f0f",
            zIndex: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "0.9rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c9a84c",
            }}
          >
            Proses I'lal {shighotName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8a8070",
              cursor: "pointer",
              padding: "0.2rem",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          {hasNoKaidah ? (
            <div style={{ textAlign: "center", paddingTop: "2rem", paddingBottom: "2rem" }}>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#8a8070",
                  fontStyle: "italic",
                }}
              >
                Kata ini tidak mengalami proses I'lal.
              </p>
            </div>
          ) : (
            <>
              {/* Asal Kata */}
              <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "#8a8070", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Asalnya Adalah
                </div>
                <div
                  dir="rtl"
                  style={{
                    fontFamily: "'Amiri', 'Scheherazade New', serif",
                    fontSize: "2.5rem",
                    color: "#e8e0d0",
                    marginTop: "0.5rem",
                  }}
                >
                  {prosesIlal.asalKata}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#5a5040", marginTop: "0.5rem" }}>
                  Bina': {prosesIlal.bina}
                </div>
              </div>

              {/* Garis Pemisah */}
              <div
                style={{
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, #2a2a2a, transparent)",
                  margin: "1.5rem 0",
                }}
              />

              {/* Langkah-langkah I'lal */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                  Kaidah yang Diterapkan:
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {prosesIlal.logProses.map((log: any, idx: number) => {
                    // Check if it's the old string format (should not happen with our update, but for safety)
                    const isObject = typeof log === "object" && log !== null;
                    const pesan = isObject ? log.pesan : log;
                    const hasilSementara = isObject ? log.hasilSementara : null;

                    return (
                      <div key={idx} style={{ position: "relative", paddingLeft: "1.5rem" }}>
                        {/* Timeline dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "0.4rem",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#c9a84c",
                          }}
                        />
                        {/* Timeline line */}
                        {idx !== prosesIlal.logProses.length - 1 && (
                          <div
                            style={{
                              position: "absolute",
                              left: "2.5px",
                              top: "0.8rem",
                              bottom: "-1.5rem",
                              width: "1px",
                              background: "#2a2a2a",
                            }}
                          />
                        )}

                        <div style={{ fontSize: "0.9rem", color: "#b8b0a0", lineHeight: 1.6 }}>
                          {pesan}
                        </div>
                        
                        {hasilSementara && (
                          <div
                            dir="rtl"
                            style={{
                              fontFamily: "'Amiri', 'Scheherazade New', serif",
                              fontSize: "1.5rem",
                              color: "#e8e0d0",
                              marginTop: "0.5rem",
                              background: "#1a1815",
                              padding: "0.5rem 1rem",
                              borderRadius: "4px",
                              display: "inline-block",
                            }}
                          >
                            {hasilSementara}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hasil Akhir */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1rem",
                  background: "#1a1815",
                  borderLeft: "3px solid #c9a84c",
                  borderRadius: "0 4px 4px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Hasil Akhir
                </span>
                <span
                  dir="rtl"
                  style={{
                    fontFamily: "'Amiri', 'Scheherazade New', serif",
                    fontSize: "2rem",
                    color: "#e8e0d0",
                  }}
                >
                  {prosesIlal.hasilAkhir}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
