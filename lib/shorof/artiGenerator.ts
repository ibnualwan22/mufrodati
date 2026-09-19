/**
 * lib/shorof/artiGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Men-generate (menebak) arti per-shighot dari satu arti dasar bahasa Indonesia.
 * Ini hanya memberikan *saran* (template fallback) otomatis untuk membantu admin.
 * Admin selalu bisa mengubah/mengisi secara manual per-shighot.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function generateSingle(
  dasarString: string,
  opsi?: { lazim?: boolean }
) {
  const dasar = dasarString.trim();
  if (!dasar) {
    return {
      artiMadhi: "", artiMudhari: "", artiMasdar: "", artiMasdarMim: "",
      artiFaail: "", artiMafuul: opsi?.lazim ? null : "", artiAmr: "",
      artiNahyi: "", artiZamanMakan: "", artiAlaat: null
    };
  }

  // Coba dapatkan akar kata kasar untuk awalan "me-" pada bahasa Indonesia
  let akarIndo = dasar;
  let isMe = false;

  const awalanKata = [
    { prefix: "meny", gantiDengan: "s" },
    { prefix: "meng", gantiDengan: "k" },
    { prefix: "mem", gantiDengan: "p" },
    { prefix: "men", gantiDengan: "t" },
    { prefix: "me", gantiDengan: "" },
    { prefix: "ber", gantiDengan: "" },
  ];

  for (const { prefix, gantiDengan } of awalanKata) {
    if (dasar.toLowerCase().startsWith(prefix) && dasar.length > prefix.length + 2) {
      isMe = true;
      let sisa = dasar.substring(prefix.length);
      if (prefix === "meng" && !["a","e","i","o","u","g","h"].includes(sisa[0])) {
         akarIndo = sisa;
      } else if (prefix === "meny") {
         akarIndo = sisa;
      } else if (prefix === "mem" && ["b", "p", "f", "v"].includes(sisa[0])) {
         akarIndo = sisa;
      } else if (prefix === "men" && ["d", "j", "c", "z", "t"].includes(sisa[0])) {
         akarIndo = sisa;
      } else {
         if (gantiDengan && ["meny", "meng", "mem", "men"].includes(prefix)) {
           akarIndo = gantiDengan + sisa;
         } else {
           akarIndo = sisa;
         }
      }
      break;
    }
  }

  const amr = akarIndo + "lah";
  const kataBenda = (isMe && akarIndo.length > 2) ? akarIndo + "an" : "proses " + dasar;
  
  return {
    artiMadhi: dasar,
    artiMudhari: "sedang/akan " + dasar,
    artiMasdar: kataBenda,
    artiMasdarMim: kataBenda,
    artiFaail: "yang " + dasar,
    artiMafuul: opsi?.lazim ? null : "yang di-" + akarIndo,
    artiAmr: amr,
    artiNahyi: "jangan " + dasar,
    artiZamanMakan: "waktu/tempat " + dasar,
    artiAlaat: opsi?.lazim ? null : "alat untuk " + dasar
  };
}

export function generateArtiPerShighot(
  artiDasar: string,
  opsi?: { lazim?: boolean }
): {
  artiMadhi: string;
  artiMudhari: string;
  artiMasdar: string[];
  artiMasdarMim: string;
  artiFaail: string;
  artiMafuul: string | null;
  artiAmr: string;
  artiNahyi: string;
  artiZamanMakan: string;
  artiAlaat: string | null;
} {
  if (!artiDasar.trim()) {
    return {
      artiMadhi: "", artiMudhari: "", artiMasdar: [], artiMasdarMim: "",
      artiFaail: "", artiMafuul: opsi?.lazim ? null : "", artiAmr: "",
      artiNahyi: "", artiZamanMakan: "", artiAlaat: null
    };
  }

  // Pecah berdasarkan garis miring lalu bersihkan spasi
  const dasarParts = artiDasar.split("/").map(p => p.trim()).filter(p => p);
  
  // Proses setiap pecahan dengan mesin
  const results = dasarParts.map(part => generateSingle(part, opsi));

  // Fungsi penggabung
  const combine = (key: keyof ReturnType<typeof generateSingle>) => {
    const validStr = results.map(r => r[key]).filter(s => s !== null && s !== "");
    if (validStr.length === 0) return opsi?.lazim && (key === "artiMafuul" || key === "artiAlaat") ? null : "";
    return validStr.join(" / ");
  };

  return {
    artiMadhi: combine("artiMadhi") as string,
    artiMudhari: combine("artiMudhari") as string,
    artiMasdar: [combine("artiMasdar") as string],
    artiMasdarMim: combine("artiMasdarMim") as string,
    artiFaail: combine("artiFaail") as string,
    artiMafuul: combine("artiMafuul") as string | null,
    artiAmr: combine("artiAmr") as string,
    artiNahyi: combine("artiNahyi") as string,
    artiZamanMakan: combine("artiZamanMakan") as string,
    artiAlaat: combine("artiAlaat") as string | null
  };
}
