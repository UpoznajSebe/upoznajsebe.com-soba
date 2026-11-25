/* Prostor Upoznaj Sebe
   Jedna stranica, bez build koraka. Radi na GitHub Pages.
   Bez Supabase podešavanja radi u DEMO režimu (sve se čuva u ovom pregledaču). */
(function () {
  "use strict";
  var C = window.SOBA_CONFIG || {};
  var S = window.SOBA_SADRZAJ || { programi: [], biblioteka: [] };
  var OSNOVNI = JSON.parse(JSON.stringify(S));
  // Programi iz sadrzaj.js koje sačuvani sadržaj još nema (npr. Kutak) se dodaju na kraj.
  function dopuni(s) {
    OSNOVNI.programi.forEach(function (p) {
      var x = s.programi.filter(function (y) { return y.id === p.id; })[0];
      if (!x) s.programi.push(JSON.parse(JSON.stringify(p)));
      else { x.tip = p.tip; x.mesecno = p.mesecno; } // pravila programa uvek iz sadrzaj.js
    });
    return s;
  }
  // Ko ima Povratak sebi, ima i Kutak.
  var PRISTUP_INFO = {};
  // Kutak uz Koren i Povratak sebi stiže kao poseban red u bazi (6 meseci), pa ovde nema dodatnih pravila.
  function prosiri(pristup) { return (pristup || []).slice(); }
  // Uplata u celosti: sve je otvoreno. Na rate: deo modula za svaku ratu (Koren 4 rate: 3, 5, 7, 9 modula).
  // Ručno dodat polaznik bez broja rata: broj uplata = broj otvorenih modula.
  function otvoreno(p) {
    var info = PRISTUP_INFO[p.id] || {}, n = p.moduli.length;
    if (info.uplate == null || clanstvo(p)) return n;
    var r = info.rate || n;
    return Math.max(1, Math.min(n, Math.ceil(n * info.uplate / r)));
  }
  function zakljucan(p, m) { return p.moduli.indexOf(m) >= otvoreno(p); }
  function clanstvo(p) { return p && p.tip === "clanstvo"; }
  // Video polje prima Vimeo broj ili YouTube link/ID (YouTube "Unlisted" za početak).
  function youtubeId(v) {
    v = String(v || "").trim();
    var m = v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(v) && /[A-Za-z_-]/.test(v) ? v : null;
  }
  // Fajlovi otpremljeni u Prostor (privatna Supabase Storage kanta "biblioteka"): vrednost "fajl:program/ime.mp3"
  function jeFajl(v) { return /^fajl:/.test(String(v || "")); }
  function putanja(v) { return String(v || "").replace(/^fajl:/, ""); }
  function jeZvuk(v) { return /\.(mp3|m4a|aac|wav|ogg|oga)$/i.test(String(v || "")); }
  function driveId(v) { var m = String(v || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([A-Za-z0-9_-]{20,})/); return m ? m[1] : null; }
  function imeFajla(v) { return putanja(v).split("/").pop().replace(/^\d+-/, ""); }
  function videoOkvir(v, naslov, id) {
    if (jeFajl(v)) {
      var pt = putanja(v);
      return jeZvuk(pt) ? '<div class="zvuk"><audio controls preload="none" data-fajl="' + esc(pt) + '" title="' + esc(naslov) + '"></audio></div>'
        : '<video controls preload="none" playsinline data-fajl="' + esc(pt) + '" title="' + esc(naslov) + '"></video>';
    }
    var dr = driveId(v);
    if (dr) return '<iframe src="https://drive.google.com/file/d/' + dr + '/preview" allow="autoplay; fullscreen" allowfullscreen title="' + esc(naslov) + '"></iframe>';
    var yt = youtubeId(v);
    var src = yt ? "https://www.youtube-nocookie.com/embed/" + yt + "?rel=0&modestbranding=1&playsinline=1"
      : "https://player.vimeo.com/video/" + encodeURIComponent(String(v).replace(/\D/g, "")) + "?dnt=1&title=0&byline=0&portrait=0";
    return '<iframe' + (id && !yt ? ' id="' + id + '"' : "") + ' src="' + src + '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="' + esc(naslov) + '"></iframe>';
  }
  function oznaka(p, m) { return clanstvo(p) ? (m.mesec || "Ovog meseca") : "Modul " + m.rim; }
  function redosled(p) { return clanstvo(p) ? p.moduli.slice().reverse() : p.moduli; }
  var DEMO = !(C.SUPABASE_URL && C.SUPABASE_KLJUC);
  var app = document.getElementById("app");
  function potpisi(pt) {
    var k = POTPISI[pt]; if (k && k.do > Date.now()) return Promise.resolve(k.url);
    return baza.potpisFajla(pt).then(function (url) { POTPISI[pt] = { url: url, do: Date.now() + 50 * 60000 }; return url; });
  }
  function razresiFajlove() {
    app.querySelectorAll('a[href^="fajl:"]').forEach(function (a) {
      var pt = putanja(a.getAttribute("href")); a.removeAttribute("href");
      potpisi(pt).then(function (u) { a.setAttribute("href", u); }).catch(function () { a.classList.add("nedostupno"); });
    });
    app.querySelectorAll("[data-fajl]:not([data-ceka])").forEach(function (el) {
      el.dataset.ceka = "1";
      potpisi(el.dataset.fajl).then(function (u) { el.src = u; }).catch(function () {});
    });
  }
  if (app && window.MutationObserver) new MutationObserver(razresiFajlove).observe(app, { childList: true, subtree: true });
  var sb = null;
  var korisnik = null;
  var JE_UREDNIK = false;
  var PODESAVANJA = {};
  var SADRZAJ_UCITAN = false;
  var POTPISI = {};
  // Sve što može da se kupi: programi + snimci koji se prodaju posebno (snimak čiji je "program" njegov sopstveni kod).
  var PROGRAMI_SVI = function () {
    var l = S.programi.map(function (p) { return { id: p.id, naziv: p.naziv }; });
    S.biblioteka.forEach(function (b) { if (b.program === b.id && !l.some(function (x) { return x.id === b.id; })) l.push({ id: b.id, naziv: b.naziv }); });
    if (!l.some(function (x) { return x.id === "relaksacija-novac"; })) l.push({ id: "relaksacija-novac", naziv: "Relaksacija za rad sa novcem" });
    return l;
  };

  /* ---------- pomoćno ---------- */
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function link(v) { return v && C[v] ? C[v] : v || ""; }
  function program(id) { return S.programi.filter(function (p) { return p.id === id; })[0]; }
  function citaj(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function pisi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function danas() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var DANI = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
  var MESECI = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];
  function lepDatum(iso) { var p = iso.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return DANI[d.getDay()] + ", " + d.getDate() + ". " + MESECI[d.getMonth()]; }
  function pozdrav() { var h = new Date().getHours(); return h < 11 ? "jutro" : h < 18 ? "dan" : "veče"; }
  function vreme(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  var IKONA = {
    soba: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    dnevnik: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    bib: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
    ured: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  };
  function ikona(d, v) { return '<svg width="' + (v || 21) + '" height="' + (v || 21) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' + d + "</svg>"; }
  var STRELICA = '<svg class="strelica" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  /* ---------- baza ---------- */
  var baza = {
    init: function () {
      if (DEMO) { var m = citaj("soba_demo_mejl", null); korisnik = m ? { email: m } : null; return Promise.resolve(); }
      sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KLJUC);
      sb.auth.onAuthStateChange(function (_e, sesija) {
        var bio = !!korisnik; korisnik = sesija ? sesija.user : null;
        if (bio !== !!korisnik) prikazi();
      });
      return sb.auth.getSession().then(function (r) { korisnik = r.data.session ? r.data.session.user : null; });
    },
    prijava: function (mejl) {
      if (DEMO) { pisi("soba_demo_mejl", mejl); korisnik = { email: mejl }; return Promise.resolve({ demo: true }); }
      return sb.auth.signInWithOtp({ email: mejl, options: { emailRedirectTo: location.href.split("#")[0], shouldCreateUser: true } })
        .then(function (r) { if (r.error) throw r.error; return {}; });
    },
    odjava: function () {
      if (DEMO) { localStorage.removeItem("soba_demo_mejl"); korisnik = null; return Promise.resolve(); }
      return sb.auth.signOut();
    },
    pristup: function () {
      if (DEMO) {
        var za6 = new Date(Date.now() + 9 * 864e5).toISOString();
        PRISTUP_INFO = { povratak: { uplate: 3, rate: 8, istice: null }, koren: { uplate: 2, rate: 4 }, "mesecna-soba": { istice: za6, poklon: true } };
        return Promise.resolve(["koren", "povratak", "relaksacija-novac", "mesecna-soba"]);
      }
      return sb.from("pristup").select("program,istice,uplate,rate").eq("aktivan", true).eq("email", String(korisnik.email || "").toLowerCase())
        .then(function (r) {
          if (r.error) throw r.error;
          var sad = new Date(); PRISTUP_INFO = {};
          return r.data.filter(function (x) { return !x.istice || new Date(x.istice) > sad; })
            .map(function (x) { PRISTUP_INFO[x.program] = { uplate: x.uplate, istice: x.istice, rate: x.rate }; return x.program; });
        });
    },
    napredak: function () {
      if (DEMO) return Promise.resolve(citaj("soba_napredak", {}));
      return sb.from("napredak").select("program,modul,pozicija,gotovo,azurirano").then(function (r) {
        if (r.error) throw r.error; var o = {};
        r.data.forEach(function (x) { o[x.program + "/" + x.modul] = x; }); return o;
      });
    },
    sacuvajNapredak: function (programId, modul, izmene) {
      var sad = new Date().toISOString();
      if (DEMO) {
        var o = citaj("soba_napredak", {}); var k = programId + "/" + modul;
        o[k] = Object.assign({ program: programId, modul: modul, pozicija: 0, gotovo: false }, o[k] || {}, izmene, { azurirano: sad });
        pisi("soba_napredak", o); return Promise.resolve();
      }
      var red = Object.assign({ user_id: korisnik.id, program: programId, modul: modul, azurirano: sad }, izmene);
      return sb.from("napredak").upsert(red, { onConflict: "user_id,program,modul" });
    },
    dnevnik: function () {
      if (DEMO) return Promise.resolve(citaj("soba_dnevnik", []).sort(function (a, b) { return a.datum < b.datum ? 1 : -1; }));
      return sb.from("dnevnik").select("id,datum,tekst").order("datum", { ascending: false }).order("azurirano", { ascending: false })
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    sacuvajStranicu: function (stranica) {
      if (DEMO) {
        var sve = citaj("soba_dnevnik", []);
        if (!stranica.id) stranica.id = "d" + Date.now();
        var i = sve.findIndex(function (x) { return x.id === stranica.id; });
        if (i >= 0) sve[i] = stranica; else sve.push(stranica);
        pisi("soba_dnevnik", sve); return Promise.resolve(stranica);
      }
      var red = { user_id: korisnik.id, datum: stranica.datum, tekst: stranica.tekst, azurirano: new Date().toISOString() };
      if (stranica.id) red.id = stranica.id;
      return sb.from("dnevnik").upsert(red).select("id,datum,tekst").single()
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    jeUrednik: function () {
      if (DEMO) return Promise.resolve(true);
      return sb.rpc("je_urednik").then(function (r) { return !r.error && r.data === true; });
    },
    ucitajSadrzaj: function () {
      if (DEMO) return Promise.resolve(citaj("soba_sadrzaj", null));
      return sb.from("sadrzaj").select("podaci").eq("id", "glavni").maybeSingle()
        .then(function (r) { return r.data ? r.data.podaci : null; });
    },
    otpremiFajl: function (fajl, folder) {
      var ime = fajl.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
      var pt = folder + "/" + Date.now() + "-" + ime;
      if (DEMO) { POTPISI[pt] = { url: URL.createObjectURL(fajl), do: Date.now() + 864e5 }; return Promise.resolve(pt); }
      return sb.storage.from("biblioteka").upload(pt, fajl, { contentType: fajl.type || undefined, upsert: false })
        .then(function (r) { if (r.error) throw r.error; return pt; });
    },
    potpisFajla: function (pt) {
      if (DEMO) return Promise.reject(new Error("demo"));
      return sb.storage.from("biblioteka").createSignedUrl(pt, 3600)
        .then(function (r) { if (r.error) throw r.error; return r.data.signedUrl; });
    },
    tekstovi: function (gde) {
      if (DEMO) return Promise.resolve(citaj("soba_tekstovi", []).filter(function (t) { return t.vidljivost === gde && t.objavljeno; }));
      return sb.from("tekstovi").select("id,naslov,sazetak,slika,vidljivost,datum").eq("vidljivost", gde).eq("objavljeno", true).order("datum", { ascending: false })
        .then(function (r) { if (r.error) throw r.error; return r.data || []; });
    },
    tekst: function (id) {
      if (DEMO) return Promise.resolve(citaj("soba_tekstovi", []).filter(function (t) { return t.id === id; })[0] || null);
      return sb.from("tekstovi").select("*").eq("id", id).maybeSingle().then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    sviTekstovi: function () {
      if (DEMO) return Promise.resolve(citaj("soba_tekstovi", []));
      return sb.from("tekstovi").select("*").order("datum", { ascending: false }).then(function (r) { if (r.error) throw r.error; return r.data || []; });
    },
    sacuvajTekst: function (t) {
      if (DEMO) { var l = citaj("soba_tekstovi", []); if (!t.id) t.id = "t" + Date.now(); l = l.filter(function (x) { return x.id !== t.id; }); l.unshift(t); pisi("soba_tekstovi", l); return Promise.resolve(t); }
      var z = { naslov: t.naslov, sazetak: t.sazetak, telo: t.telo, slika: t.slika, vidljivost: t.vidljivost, objavljeno: t.objavljeno, datum: t.datum, azurirano: new Date().toISOString() };
      var q = t.id ? sb.from("tekstovi").update(z).eq("id", t.id).select().single() : sb.from("tekstovi").insert(z).select().single();
      return q.then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    obrisiTekst: function (id) {
      if (DEMO) { pisi("soba_tekstovi", citaj("soba_tekstovi", []).filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
      return sb.from("tekstovi").delete().eq("id", id).then(function (r) { if (r.error) throw r.error; });
    },
    sacuvajSadrzaj: function (podaci) {
      if (DEMO) { pisi("soba_sadrzaj", podaci); return Promise.resolve(); }
      return sb.from("sadrzaj").upsert({ id: "glavni", podaci: podaci, azurirano: new Date().toISOString() })
        .then(function (r) { if (r.error) throw r.error; });
    },
    podesavanja: function () {
      if (DEMO) return Promise.resolve(citaj("soba_podesavanja", {}));
      return sb.from("podesavanja").select("kljuc,vrednost").then(function (r) {
        var o = {}; (r.data || []).forEach(function (x) { o[x.kljuc] = x.vrednost; }); return o;
      });
    },
    sacuvajPodesavanje: function (kljuc, vrednost) {
      if (DEMO) { var o = citaj("soba_podesavanja", {}); o[kljuc] = vrednost; pisi("soba_podesavanja", o); return Promise.resolve(); }
      return sb.from("podesavanja").upsert({ kljuc: kljuc, vrednost: vrednost, azurirano: new Date().toISOString() })
        .then(function (r) { if (r.error) throw r.error; });
    },
    promocije: function () {
      if (DEMO) return Promise.resolve(citaj("soba_promocije", []));
      return sb.from("promocije").select("*").order("napravljeno", { ascending: false })
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    sacuvajPromociju: function (p) {
      if (DEMO) {
        var sve = citaj("soba_promocije", []); if (!p.id) { p.id = "p" + Date.now(); p.napravljeno = new Date().toISOString(); }
        var i = sve.findIndex(function (x) { return x.id === p.id; }); if (i >= 0) sve[i] = p; else sve.unshift(p);
        pisi("soba_promocije", sve); return Promise.resolve(p);
      }
      return sb.from("promocije").upsert(p).select("*").single().then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    obrisiPromociju: function (id) {
      if (DEMO) { pisi("soba_promocije", citaj("soba_promocije", []).filter(function (x) { return x.id !== id; })); return Promise.resolve(); }
      return sb.from("promocije").delete().eq("id", id).then(function (r) { if (r.error) throw r.error; });
    },
    sviPristupi: function () {
      if (DEMO) return Promise.resolve(citaj("soba_pristupi", [{ email: "test@mejl.com", program: "koren", aktivan: true }, { email: "test@mejl.com", program: "povratak", aktivan: true }]));
      return sb.from("pristup").select("email,program,aktivan,izvor,istice,uplate,azurirano").order("azurirano", { ascending: false })
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    dodajPristup: function (email, programi, uplate) {
      email = email.toLowerCase().trim();
      if (DEMO) {
        var sve = citaj("soba_pristupi", []);
        programi.forEach(function (pr) {
          var i = sve.findIndex(function (x) { return x.email === email && x.program === pr; });
          var mes = program(pr) && program(pr).mesecno;
          if (i >= 0) { sve[i].aktivan = true; if (mes) sve[i].uplate = uplate; } else sve.unshift({ email: email, program: pr, aktivan: true, izvor: "rucno", uplate: mes ? uplate : null });
        });
        pisi("soba_pristupi", sve); return Promise.resolve();
      }
      var redovi = programi.map(function (pr) {
        var r = { email: email, program: pr, aktivan: true, izvor: "rucno", azurirano: new Date().toISOString() };
        if (program(pr) && program(pr).mesecno) r.uplate = uplate; // koliko modula je otvoreno (null = sve)
        if (pr === "koren" || pr === "povratak") r.istice = new Date(Date.now() + 3 * 365 * 864e5).toISOString();
        return r;
      });
      var poklon = programi.some(function (pr) { return pr === "koren" || pr === "povratak"; }) && programi.indexOf("mesecna-soba") < 0;
      return sb.from("pristup").upsert(redovi, { onConflict: "email,program" }).then(function (r) {
        if (r.error) throw r.error;
        if (!poklon) return;
        // 6 meseci Kutka na poklon; ako Kutak već postoji, ne diramo ga.
        return sb.from("pristup").upsert([{ email: email, program: "mesecna-soba", aktivan: true, izvor: "poklon", azurirano: new Date().toISOString(),
          istice: new Date(Date.now() + 182 * 864e5).toISOString() }], { onConflict: "email,program", ignoreDuplicates: true })
          .then(function (r2) { if (r2.error) throw r2.error; });
      });
    },
    promeniPristup: function (email, program, aktivan) {
      if (DEMO) {
        var sve = citaj("soba_pristupi", []); sve.forEach(function (x) { if (x.email === email && x.program === program) x.aktivan = aktivan; });
        pisi("soba_pristupi", sve); return Promise.resolve();
      }
      return sb.from("pristup").update({ aktivan: aktivan, azurirano: new Date().toISOString() }).eq("email", email).eq("program", program)
        .then(function (r) { if (r.error) throw r.error; });
    },
    postaviUplate: function (email, programId, n) {
      if (DEMO) {
        var sve = citaj("soba_pristupi", []); sve.forEach(function (x) { if (x.email === email && x.program === programId) x.uplate = n; });
        pisi("soba_pristupi", sve); return Promise.resolve();
      }
      return sb.from("pristup").update({ uplate: n, azurirano: new Date().toISOString() }).eq("email", email).eq("program", programId)
        .then(function (r) { if (r.error) throw r.error; });
    },
    upitnikPopunjen: function () {
      if (DEMO) { var du = citaj("soba_upitnik", null); return Promise.resolve(!!(du && !du.preskocio && du.dovodi)); }
      // Popunjen = postoji red sa pravim odgovorima (stari "preskočio" se ne računa).
      return sb.from("upitnik").select("odgovori").eq("user_id", korisnik.id).maybeSingle()
        .then(function (r) { if (r.error) throw r.error; return !!(r.data && r.data.odgovori && !r.data.odgovori.preskocio && r.data.odgovori.dovodi); });
    },
    sacuvajUpitnik: function (odgovori) {
      if (DEMO) { pisi("soba_upitnik", odgovori); return Promise.resolve(); }
      return sb.from("upitnik").upsert({ user_id: korisnik.id, email: String(korisnik.email || "").toLowerCase(), odgovori: odgovori }, { onConflict: "user_id" })
        .then(function (r) { if (r.error) throw r.error; });
    },
    sviUpitnici: function () {
      if (DEMO) { var u = citaj("soba_upitnik", null); return Promise.resolve(u ? [{ email: "proba@mejl.com", odgovori: u, napravljeno: new Date().toISOString() }] : []); }
      return sb.from("upitnik").select("email,odgovori,napravljeno").order("napravljeno", { ascending: false }).limit(50)
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    pregled: function () {
      if (DEMO) return baza.sviPristupi().then(function (sve) {
        var n = citaj("soba_napredak", {});
        return sve.map(function (x) {
          var moji = Object.keys(n).map(function (k) { return n[k]; }).filter(function (y) { return y.program === x.program; });
          var posl = moji.map(function (y) { return y.azurirano; }).sort().pop() || null;
          return { email: x.email, program: x.program, aktivan: x.aktivan, poslednja_aktivnost: posl,
            odgledano_modula: moji.filter(function (y) { return y.gotovo; }).length,
            udaljava_se: !posl || (Date.now() - new Date(posl)) > 14 * 864e5 };
        });
      });
      return sb.rpc("pregled_polaznika").then(function (r) { if (r.error) throw r.error; return r.data; });
    },
  };

  /* ---------- delovi ekrana ---------- */
  function meni(aktivno) {
    var stavke = [["#/", "soba", "Prostor"], ["#/dnevnik", "dnevnik", "Moj dnevnik"], ["#/biblioteka", "bib", "Biblioteka"]];
    if (JE_UREDNIK) stavke.push(["#/uredjivanje", "ured", "Uređivanje"]);
    return '<nav class="meni" aria-label="Glavni meni"><div class="u"><a class="logo meni-logo" href="#/">Upoznaj Sebe</a>' + stavke.map(function (s) {
      return '<a href="' + s[0] + '"' + (s[1] === aktivno ? ' aria-current="page"' : "") + ">" + ikona(IKONA[s[1]]) + s[2] + "</a>";
    }).join("") + "</div></nav>";
  }
  function zaglavlje(desno) {
    return '<header class="zaglavlje"><a class="logo" href="#/">Upoznaj Sebe</a>' + (desno || "") + "</header>";
  }
  function demoTraka() { return DEMO ? '<div class="demo-traka">Probna verzija · sve što upišeš ostaje samo u ovom pregledaču</div>' : ""; }
  function naslovna(p, visina, velicina, klasa) {
    var natpis = p.naslovnaTekst ? '<div class="natpis"><span class="k" style="font-size:' + Math.round(velicina * 0.42) + 'px">' + esc(p.naziv.split(" ")[0]) +
      '</span><span class="a" style="font-size:' + velicina + 'px">' + esc(p.naziv.split(" ").slice(1).join(" ")) + "</span></div>" : "";
    return '<div class="naslovna ' + (klasa || "") + '" style="--v:' + visina + 'px"><img src="' + p.slika + '" alt="' + esc(p.naziv) + '"><div class="sloj"></div>' + natpis + "</div>";
  }
  function greska(e) {
    console.error(e);
    app.innerHTML = '<div class="ekran">' + zaglavlje() + '<div class="okvir" style="padding-top:48px;display:flex;flex-direction:column;gap:18px">' +
      '<h1>Nešto <em>nije stiglo.</em></h1><p class="tekst">Osveži stranicu za minut. Ako se ponovi, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</p></div></div>";
  }

  /* ---------- ekrani ---------- */
  function ekranUlaz(poruka) {
    app.innerHTML = '<main class="ekran ulaz" style="padding-bottom:40px">' + demoTraka() +
      '<div class="ulaz-slika"><img src="' + esc((PODESAVANJA.naslovna && PODESAVANJA.naslovna.slikaUlaz) || "slike/cvetovi.jpg") + '" alt=""><div class="sloj"></div>' +
      '<div class="vrh"><span class="logo" style="color:#fff">Upoznaj Sebe</span></div>' +
      '<div class="dno"><span class="ozn">Tvoj prostor</span><h1>Upoznaj<em>sebe.</em></h1></div></div>' +
      '<form id="forma" class="okvir ulaz-forma" novalidate>' +
      (poruka ? '<div class="poruka" role="status">' + poruka + "</div>" :
        '<p class="tekst" style="text-align:center">Upiši mejl sa kojim si kupio program. Poslaćemo ti link za ulaz, lozinka ti ne treba.</p>') +
      '<div style="display:flex;flex-direction:column;gap:8px"><label class="oznaka" for="mejl">Tvoj mejl</label>' +
      '<input class="polje" id="mejl" type="email" autocomplete="email" inputmode="email" placeholder="ime@mejl.com" required></div>' +
      '<button class="dugme" type="submit">Pošalji mi link</button>' +
      '<p class="tiho" style="text-align:center">Link važi sat vremena. Ako ne stigne za par minuta, pogledaj i u Promocije ili Spam.</p>' +
      '<div class="ulaz-ili"><span>Prvi put si ovde?</span></div><a class="dugme obrub" href="#/ponuda">Pridruži se</a></form></main>';
    document.getElementById("forma").addEventListener("submit", function (e) {
      e.preventDefault();
      var mejl = document.getElementById("mejl").value.trim();
      if (!/^\S+@\S+\.\S+$/.test(mejl)) { document.getElementById("mejl").focus(); return; }
      var dugme = e.target.querySelector("button"); dugme.disabled = true; dugme.textContent = "Šaljem...";
      baza.prijava(mejl).then(function (r) {
        if (r.demo) { location.hash = "#/"; prikazi(); return; }
        ekranUlaz("Poslali smo ti link na <strong>" + esc(mejl) + "</strong>. Otvori mejl na ovom uređaju i klikni na link. Ova stranica može da ostane otvorena.");
      }).catch(function (err) {
        console.error(err); dugme.disabled = false; dugme.textContent = "Pošalji mi link";
        ekranUlaz("Link nije poslat. Proveri da li je mejl tačno upisan, pa probaj ponovo.");
      });
    });
  }

  function poslednji(napredak, pristup) {
    var lista = Object.keys(napredak).map(function (k) { return napredak[k]; })
      .filter(function (x) { return pristup.indexOf(x.program) >= 0; })
      .sort(function (a, b) { return (a.azurirano || "") < (b.azurirano || "") ? 1 : -1; });
    var r = lista[0];
    if (r) {
      var p = program(r.program); if (!p) return null;
      var i = p.moduli.findIndex(function (m) { return m.id === r.modul; });
      if (r.gotovo && i < otvoreno(p) - 1) return { p: p, m: p.moduli[i + 1], poz: 0 };
      return { p: p, m: p.moduli[i], poz: r.pozicija || 0 };
    }
    var prvi = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0; })[0];
    return prvi && prvi.moduli.length ? { p: prvi, m: redosled(prvi)[0], poz: 0, novo: true } : null;
  }

  function ekranSoba(pristup, napredak) {
    var dalje = poslednji(napredak, pristup);
    var moji = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0; });
    var ostali = S.programi.filter(function (p) { return pristup.indexOf(p.id) < 0; });
    var nemaBib = S.biblioteka.filter(function (b) { return pristup.indexOf(b.program) < 0 && !program(b.program); });
    var h = '<main class="ekran soba">' + demoTraka() + zaglavlje('<button class="malo-dugme" id="odjava">Odjava</button>') +
      '<div class="okvir pozdrav">' +
      '<div class="nadnaslov">' + DANI[new Date().getDay()] + "</div>" +
      "<h1>Dobro <em>" + pozdrav() + ".</em></h1>" +
      '<p class="tekst">' + esc((PODESAVANJA.naslovna && PODESAVANJA.naslovna.recenica) || "Ne moraš danas sve. Dovoljan je jedan deo.") + "</p>" +
      (PODESAVANJA.naslovna && PODESAVANJA.naslovna.poruka ? '<div class="poruka-meseca">' + esc(PODESAVANJA.naslovna.poruka) + "</div>" : "") +
      '</div><div class="soba-mreza">';
    if (dalje) {
      var gotovoDeo = dalje.m && dalje.poz ? '<p class="tiho">Stao si na ' + vreme(dalje.poz) + "</p>" : "";
      h += '<section class="kartica nastavi" aria-label="Nastavi gde si stao">' + naslovna(dalje.p, 190, 34, "velika") +
        '<div style="padding:24px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="nadnaslov">' + (dalje.novo ? "Kreni odavde" : "Nastavi gde si stao") + "</div>" +
        "<h2>" + esc(oznaka(dalje.p, dalje.m)) + " · <em>" + esc(dalje.m.naziv) + "</em></h2>" + gotovoDeo +
        '<a class="dugme" style="margin-top:8px" href="#/modul/' + dalje.p.id + "/" + dalje.m.id + '">' + (dalje.novo ? "Počni" : "Nastavi") + "</a></div></section>";
    }
    h += '<div class="soba-desno">';
    // Samostalno kupljeni snimci (npr. Relaksacija) žive u Biblioteci, ali ih kupac vidi i ovde.
    var mojaBib = S.biblioteka.filter(function (b) { return pristup.indexOf(b.program) >= 0 && !program(b.program); });
    if (moji.length || mojaBib.length) {
      h += '<section class="okvir prostorije" aria-label="Tvoje prostorije"><div class="nadnaslov">Tvoje prostorije</div>' +
        mojaBib.map(function (b) {
          return '<a class="prostorija" href="#/biblioteka/' + esc(b.id) + '"><img src="' + b.slika + '" alt=""><span style="flex:1;display:flex;flex-direction:column;gap:4px"><span class="ime">' +
            esc(b.naziv) + '</span><span class="tiho">' + esc(b.opis || "Snimak") + ' · u Biblioteci</span></span>' + STRELICA + "</a>";
        }).join("") +
        moji.map(function (p) {
          var g = p.moduli.filter(function (m) { var x = napredak[p.id + "/" + m.id]; return x && x.gotovo; }).length;
          return '<a class="prostorija" href="#/program/' + p.id + '"><img src="' + p.slika + '" alt=""><span style="flex:1;display:flex;flex-direction:column;gap:4px"><span class="ime">' +
            esc(p.naziv) + '</span><span class="tiho">' + esc(p.kratko) + (g ? " · prošao si " + g : "") + "</span></span>" + STRELICA + "</a>";
        }).join("") + "</section>";
    } else {
      h += '<div class="okvir prostorije"><div class="poruka">Na ovom mejlu još nema otvorenih programa. Ako si kupio program sa drugim mejlom, odjavi se i uđi sa njim. Ako ne uspeš, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</div></div>";
    }
    var vidljivo = vidljivePonude().map(function (o) { return o.id; });
    var predlozi = ostali.map(function (p) { return { id: p.id, naziv: p.naziv, slika: p.slika, link: "#/ponuda/" + p.id }; })
      .concat(nemaBib.map(function (b) { return { id: b.program, naziv: b.naziv, slika: b.slika, link: "#/ponuda/" + b.program }; }))
      .filter(function (x) { return vidljivo.indexOf(x.id) >= 0; });
    if (predlozi.length) {
      var pr = predlozi[0];
      h += '<a class="malo-dugme" href="#/ponuda" style="align-self:flex-start">Svi programi →</a>';
      h += '<a class="predlog" href="' + esc(pr.link || "https://upoznajsebe.com/") + '"' + (pr.link ? "" : ' target="_blank" rel="noopener"') + '>' +
        '<img src="' + pr.slika + '" alt="" style="width:56px;height:56px;object-fit:cover;flex:none"><span><span class="nadnaslov" style="font-size:10px">Još iz Upoznaj Sebe</span>' +
        '<span style="display:block;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--ink)">' + esc(pr.naziv) + "</span></span></a>";
    }
    var kInfo = PRISTUP_INFO["mesecna-soba"] || {}, kOff = ponudaZa("mesecna-soba") || {};
    var kDana = kInfo.istice ? Math.ceil((new Date(kInfo.istice) - new Date()) / 864e5) : null;
    var imaProgram = S.programi.some(function (p) { return !clanstvo(p) && pristup.indexOf(p.id) >= 0; });
    if ((kDana != null && kDana <= 21 && pristup.indexOf("mesecna-soba") >= 0) || (imaProgram && pristup.indexOf("mesecna-soba") < 0)) {
      var istekao = pristup.indexOf("mesecna-soba") < 0;
      h += '<section class="promocija" aria-label="Kutak"><img src="slike/mesecna.jpg" alt=""><div class="promocija-tekst"><div class="nadnaslov">Kutak</div>' +
        "<h3>" + (istekao ? "Tvoj Kutak je zatvoren." : "Tvoj Kutak ističe za " + kDana + (kDana === 1 ? " dan." : " dana.")) + "</h3>" +
        '<p class="tekst">' + (istekao ? "Novi video i tekstovi i dalje stižu svakog meseca. Možeš da se vratiš kad god poželiš." : "Ako želiš da ti i dalje svakog meseca stiže novi video i tekstovi, nastavi bez prekida.") + "</p>" +
        (kOff.kupi ? '<a class="dugme obrub" href="' + esc(kOff.kupi) + '">Nastavi za ' + esc(kOff.cena || "19 € mesečno") + "</a>" : '<a class="dugme obrub" href="#/ponuda/mesecna-soba">Pogledaj Kutak</a>') + "</div></section>";
    }
    h += '<div id="promocije"></div></div></div></main>' + meni("soba");
    app.innerHTML = h;
    baza.promocije().then(function (lista) {
      var d = danas();
      var moje = (lista || []).filter(function (x) { return x.aktivna && x.od <= d && x["do"] >= d && (x.ciljna === "svi" || pristup.indexOf(x.ciljna) < 0); });
      var el = document.getElementById("promocije"); if (!el || !moje.length) return;
      el.innerHTML = moje.slice(0, 2).map(kartaPromocije).join("");
    }).catch(function () {});
    document.getElementById("odjava").addEventListener("click", function () { baza.odjava().then(prikazi); });
  }

  function kartaPromocije(x) {
    var spolja = /^https?:/.test(x.link || "");
    return '<section class="promocija" aria-label="Promocija">' + (x.slika ? '<img src="' + esc(x.slika) + '" alt="">' : "") +
      '<div class="promocija-tekst"><div class="nadnaslov">Iz Upoznaj Sebe</div><h3>' + esc(x.naslov) + "</h3>" +
      (x.tekst ? '<p class="tekst">' + esc(x.tekst) + "</p>" : "") +
      (x.link ? '<a class="dugme obrub" href="' + esc(x.link) + '"' + (spolja ? ' target="_blank" rel="noopener"' : "") + ">" + esc(x.dugme || "Pogledaj") + "</a>" : "") + "</div></section>";
  }

  function statusModula(p, m, napredak, trenutni) {
    var x = napredak[p.id + "/" + m.id];
    if (trenutni && trenutni.p.id === p.id && trenutni.m.id === m.id && !(x && x.gotovo)) return ["ovde", x && x.pozicija ? "Ovde si · " + vreme(x.pozicija) : "Ovde si"];
    if (x && x.gotovo) return ["", "Odgledano"];
    return ["", ""];
  }

  function ekranProgram(p, pristup, napredak) {
    if (pristup.indexOf(p.id) < 0) return ekranZatvoreno(p);
    var tren = poslednji(napredak, pristup);
    var h = '<main class="ekran program">' + demoTraka() + '<div class="program-vrh" style="position:relative">' + naslovna(p, 260, 42, "zaglavna") +
      '<a href="#/" class="malo-dugme" style="position:absolute;top:16px;left:16px;background:rgba(250,248,244,.92);color:var(--pl);padding:0 16px">← Prostor</a></div>';
    var citat = "";
    if (p.citat) citat = '<div class="okvir citat">' +
      '<p style="font-family:var(--serif);font-style:italic;font-weight:300;font-size:25px;line-height:1.4;color:var(--ink)">„' + esc(p.citat) + '”</p><span class="tiho" style="letter-spacing:.24em;text-transform:uppercase;font-size:10.5px">Milica Bilbija</span></div>';
    else citat = '<div class="okvir citat"><h1>' + esc(p.naziv) + "</h1></div>";
    var uvod = "";
    if (p.uvod || link(p.uvodPdf)) uvod = '<section class="pismo okvir" aria-label="Pismo od Milice"><div class="glava"><img src="slike/milica.jpg" alt="Milica Bilbija"><span><span class="nadnaslov" style="font-size:10px">Pre početka</span>' +
      '<span style="display:block;font-family:var(--serif);font-size:19px;color:var(--ink)">Pismo od Milice</span></span></div>' +
      (p.uvod ? '<p class="tekst">' + esc(p.uvod) + '</p><span class="potpis">Milica</span>' : "") +
      (link(p.uvodPdf) ? '<a class="dugme obrub" href="' + esc(link(p.uvodPdf)) + '" target="_blank" rel="noopener">Otvori pismo i uputstvo</a>' : "") + "</section>";
    h += '<div class="dve-kolone"><div class="glavno">' + citat + uvod + '<section class="okvir blok" aria-label="Moduli"><div class="nadnaslov">' + (clanstvo(p) ? "Po mesecima" : "Moduli") + '</div><div style="padding-top:8px">' +
      redosled(p).map(function (m) {
        var st = statusModula(p, m, napredak, tren);
        if (zakljucan(p, m)) {
          return '<div class="red zakljucan"><span class="broj">' + esc(m.rim) + '</span><span style="flex:1"><span class="naziv">' + esc(m.naziv) + '</span><span class="status">' +
            "Otvara se sa sledećom ratom" + "</span></span></div>";
        }
        return '<a class="red ' + st[0] + '" href="#/modul/' + p.id + "/" + m.id + '"><span class="broj">' + esc(clanstvo(p) ? (m.mesec || "").split(" ")[0].slice(0, 3) : m.rim) + '</span><span style="flex:1"><span class="naziv">' + esc(m.naziv) + "</span>" +
          (m.podnaslov ? '<span class="pod">' + esc(m.podnaslov) + "</span>" : "") + (st[1] ? '<span class="status">' + st[1] + "</span>" : "") + "</span></a>";
      }).join("") + "</div></section>";
    var uz = (p.uzProgram || []).filter(function (u) { return link(u.link); });
    h += '</div><aside class="strana">';
    if (uz.length) h += '<section class="okvir blok" style="display:flex;flex-direction:column;gap:14px" aria-label="Uz program"><div class="nadnaslov">Uz program</div><div class="mreza3">' +
      uz.map(function (u) { var l = link(u.link); var spolja = /^https?:/.test(l);
        return '<a class="plocica" href="' + esc(l) + '"' + (spolja ? ' target="_blank" rel="noopener"' : "") + ">" + esc(u.naziv) + "<small>" + esc(u.opis) + "</small></a>"; }).join("") + "</div></section>";
    h += "</aside></div></main>" + meni("soba");
    app.innerHTML = h;
  }

  /* ---------- upitnik pri prvom ulasku ---------- */
  function ekranUpitnik(dalje) {
    app.innerHTML = '<main class="ekran bez-menija">' + demoTraka() + zaglavlje() +
      '<div class="okvir" style="max-width:620px;padding-top:40px;display:flex;flex-direction:column;gap:22px">' +
      '<div class="nadnaslov">Dobro došao</div><h1>Pre nego što <em>uđeš.</em></h1>' +
      '<p class="tekst">Četiri kratka pitanja, pre prvog ulaska. Odgovore čitam samo ja, i pomažu mi da Prostor i program pratim tako da odgovaraju baš tebi.</p>' +
      '<form id="upitnik" class="forma-ured" style="display:flex;flex-direction:column;gap:18px">' +
      polje("u-ime", "Kako da ti se obraćam?", "") +
      polje("u-dovodi", "Šta te dovodi u Prostor?", "", "dugo") +
      polje("u-promena", "Šta bi voleo da bude drugačije za tebe za nekoliko meseci?", "", "dugo") +
      izbor("u-izvor", "Kako si čuo za mene?", [["instagram", "Instagram"], ["preporuka", "Preporuka"], ["sajt", "Sajt"], ["drugo", "Drugo"]], "instagram") +
      '<button class="dugme" type="submit">Sačuvaj i uđi</button></form></div></main>';
    function gotovo(odg) {
      baza.sacuvajUpitnik(odg).catch(function (e) {
        console.error("upitnik čuvanje", e);
        javi("Odgovori nisu sačuvani: " + ((e && (e.message || e.code)) || "greška"), true);
        return new Promise(function (r) { setTimeout(function () { r("greska"); }, 2500); });
      }).then(function (ishod) {
        if (ishod !== "greska") { try { localStorage.setItem("soba_upitnik_" + korisnik.id, "1"); } catch (_) {} }
        dalje();
      });
    }
    document.getElementById("upitnik").addEventListener("submit", function (e) {
      e.preventDefault();
      var odg = { ime: vr("u-ime"), dovodi: document.getElementById("u-dovodi").value.trim(), promena: document.getElementById("u-promena").value.trim(), izvor: vr("u-izvor") };
      var prazno = [["u-ime", odg.ime], ["u-dovodi", odg.dovodi], ["u-promena", odg.promena]].filter(function (x) { return !x[1]; });
      if (prazno.length) { javi("Molim te, odgovori na sva pitanja.", true); document.getElementById(prazno[0][0]).focus(); return; }
      this.querySelector("button[type=submit]").disabled = true;
      gotovo(odg);
    });
  }
  var UPITNIK_STANJE = null; // null → "provera" → "prikazan" → "gotovo"
  function trebaUpitnik() {
    if (JE_UREDNIK || !korisnik) return Promise.resolve(false);
    try { if (localStorage.getItem("soba_upitnik_" + korisnik.id)) return Promise.resolve(false); } catch (_) {}
    return baza.upitnikPopunjen().then(function (da) {
      if (da) { try { localStorage.setItem("soba_upitnik_" + korisnik.id, "1"); } catch (_) {} }
      return !da;
    }).catch(function (e) { console.error("upitnik provera", e); return true; }); // ako provera ne uspe, ipak pitaj
  }

  /* ---------- Tekstovi: javni Blog i Kutak za čitanje ---------- */
  // Prazan red = novi pasus, "## " = podnaslov, "- " = stavka, **reč** = podebljano.
  function tekstUHtml(t) {
    return String(t || "").replace(/\r/g, "").split(/\n\s*\n/).map(function (blok) {
      blok = blok.trim(); if (!blok) return "";
      var linije = blok.split("\n");
      var fmt = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };
      if (/^##\s/.test(blok) && linije.length === 1) return "<h2>" + fmt(blok.replace(/^##\s*/, "")) + "</h2>";
      if (linije.every(function (l) { return /^\s*-\s/.test(l); })) return "<ul>" + linije.map(function (l) { return "<li>" + fmt(l.replace(/^\s*-\s*/, "")) + "</li>"; }).join("") + "</ul>";
      return "<p>" + linije.map(fmt).join("<br>") + "</p>";
    }).join("");
  }
  function datumTekst(d) { try { return new Date(d).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function vrhJavni() {
    if (korisnik) return zaglavlje('<a class="malo-dugme" href="#/">Prostor</a>');
    return '<header class="zaglavlje"><a class="logo" href="https://upoznajsebe.com/">Upoznaj Sebe</a><a class="malo-dugme" href="#/">Uđi u Prostor</a></header>';
  }
  function listaTekstova(lista, osnova, prazno) {
    if (!lista.length) return '<p class="tekst okvir" style="padding-top:12px">' + prazno + "</p>";
    return '<section class="okvir tekstovi-lista">' + lista.map(function (t) {
      return '<a class="tekst-kartica" href="#/' + osnova + "/" + esc(t.id) + '">' + (t.slika ? '<img src="' + esc(t.slika) + '" alt="">' : "") +
        '<span class="tekst-kartica-tekst"><span class="tiho">' + esc(datumTekst(t.datum)) + '</span><span class="ime">' + esc(t.naslov) + '</span><span class="tekst" style="font-size:15px">' + esc(t.sazetak || "") + "</span></span></a>";
    }).join("") + "</section>";
  }
  function clanak(t, nazad, natpis) {
    return '<article class="okvir clanak">' + '<a class="malo-dugme" href="' + nazad + '">← ' + natpis + "</a>" +
      (t.slika ? '<img class="clanak-slika" src="' + esc(t.slika) + '" alt="">' : "") +
      '<span class="tiho">' + esc(datumTekst(t.datum)) + "</span><h1>" + esc(t.naslov) + "</h1>" +
      (t.sazetak ? '<p class="clanak-uvod">' + esc(t.sazetak) + "</p>" : "") + '<div class="clanak-telo">' + tekstUHtml(t.telo) + "</div></article>";
  }
  function ekranBlog(id) {
    var kraj = korisnik ? meni("soba") : "";
    var poziv = '<section class="okvir blog-poziv"><div class="nadnaslov">Prostor Upoznaj Sebe</div><h3>Pridruži nam se u Prostoru</h3>' +
      '<p class="tekst">Svakog meseca novi video, tekstovi i vežba, za 19 € mesečno.</p><a class="dugme" href="#/ponuda/mesecna-soba">Saznaj više</a></section>';
    app.innerHTML = '<main class="ekran ponuda' + (korisnik ? "" : " bez-menija") + '">' + demoTraka() + vrhJavni() + '<p class="tiho okvir" style="padding-top:40px">Učitavam...</p></main>' + kraj;
    if (id) return baza.tekst(id).then(function (t) {
      if (!t) { location.hash = "#/blog"; return; }
      app.innerHTML = '<main class="ekran ponuda' + (korisnik ? "" : " bez-menija") + '">' + demoTraka() + vrhJavni() + clanak(t, "#/blog", "Svi tekstovi") + poziv + "</main>" + kraj;
    }).catch(greska);
    baza.tekstovi("blog").then(function (l) {
      app.innerHTML = '<main class="ekran ponuda' + (korisnik ? "" : " bez-menija") + '">' + demoTraka() + vrhJavni() +
        '<div class="okvir pozdrav"><div class="nadnaslov">Blog</div><h1>Tekstovi za <em>čitanje</em></h1><p class="tekst">O obrascima iz detinjstva, odnosima i tome kako da razumeš sebe.</p></div>' +
        listaTekstova(l, "blog", "Prvi tekstovi stižu uskoro.") + poziv + "</main>" + kraj;
    }).catch(greska);
  }
  function ekranCitanje(pristup, id) {
    var ima = pristup.indexOf("mesecna-soba") >= 0 || JE_UREDNIK;
    var vrh = '<main class="ekran citanje">' + demoTraka() + zaglavlje();
    if (!ima) {
      app.innerHTML = vrh + '<div class="okvir pozdrav"><div class="nadnaslov">Kutak za čitanje</div><h1>Tekstovi za <em>članove Kutka</em></h1>' +
        '<p class="tekst">Ovde su tekstovi za pomoć i samopomoć koje pišem samo za članove Kutka.</p><a class="dugme" href="#/ponuda/mesecna-soba">Pridruži se Kutku</a></div></main>' + meni("bib");
      return;
    }
    if (id) return baza.tekst(id).then(function (t) {
      if (!t) { location.hash = "#/citanje"; return; }
      app.innerHTML = vrh + clanak(t, "#/citanje", "Kutak za čitanje") + "</main>" + meni("bib");
    }).catch(greska);
    baza.tekstovi("kutak").then(function (l) {
      app.innerHTML = vrh + '<div class="okvir pozdrav"><div class="nadnaslov">Kutak za čitanje</div><h1>Za večeri kad želiš da <em>razumeš</em></h1>' +
        '<p class="tekst">Tekstovi samo za članove Kutka. Čitaj polako, i vrati se onom koji ti zatreba.</p></div>' +
        listaTekstova(l, "citanje", "Prvi tekstovi stižu uskoro.") + "</main>" + meni("bib");
    }).catch(greska);
  }

  /* ---------- ponuda: javne prodajne stranice ---------- */
  var OSNOVNI_REDOSLED = ["mesecna-soba", "koren", "povratak", "relaksacija-novac"];
  // Redosled i nove ponude čuvaju se u podešavanjima, pa ih vidi i posetilac koji nije prijavljen.
  function redosledPonude() {
    var l = (PODESAVANJA.redosledPonude || []).slice();
    OSNOVNI_REDOSLED.forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); });
    Object.keys(PODESAVANJA.ponuda || {}).forEach(function (id) { if (l.indexOf(id) < 0) l.push(id); });
    return l;
  }
  function vidljivePonude() { return redosledPonude().map(ponudaZa).filter(function (o) { return o && !o.skrivena; }); }
  function ponudaZa(id) {
    var izmene = (PODESAVANJA.ponuda || {})[id] || {};
    var osnovno = (OSNOVNI.ponuda || {})[id] || ((PODESAVANJA.ponuda || {})[id] ? {} : null);
    if (!osnovno) return null;
    var o = {}; Object.keys(osnovno).forEach(function (k) { o[k] = osnovno[k]; });
    Object.keys(izmene).forEach(function (k) { if (izmene[k] !== "" && izmene[k] != null) o[k] = izmene[k]; });
    if (izmene.kupi !== undefined) o.kupi = izmene.kupi;
    if (izmene.kupiRate !== undefined) o.kupiRate = izmene.kupiRate;
    var p = program(id), b = S.biblioteka.filter(function (x) { return x.program === id; })[0];
    o.id = id; o.naziv = izmene.naziv || (p ? p.naziv : b ? b.naziv : id); o.slika = izmene.slika || (p ? p.slika : b ? b.slika : "slike/cvetovi.jpg");
    o.skrivena = !!izmene.skrivena;
    o.pretplata = /mese/i.test(o.cena || "");
    return o;
  }
  function vrhPonude() {
    if (korisnik) return zaglavlje();
    return '<header class="zaglavlje"><a class="logo" href="#/ponuda">Upoznaj Sebe</a><a class="malo-dugme" href="#/">Uđi u Prostor</a></header>';
  }
  function ekranPonuda(pristup) {
    var stavke = vidljivePonude();
    var h = '<main class="ekran ponuda' + (korisnik ? "" : " bez-menija") + '">' + demoTraka() + vrhPonude() +
      '<div class="okvir pozdrav"><div class="nadnaslov">Prostor Upoznaj Sebe</div><h1>Pridruži <em>se.</em></h1>' +
      '<p class="tekst">U Prostor ulaziš na jedan od ovih načina. Sve što dobiješ živi na jednom mestu: video, materijali i tvoj dnevnik. Plaćaš karticom, a ulaziš preko linka na mejl, bez lozinke.</p></div>' +
      '<section class="okvir ponuda-lista">' + stavke.map(function (o) {
        var imam = pristup.indexOf(o.id) >= 0;
        return '<a class="ponuda-kartica" href="#/ponuda/' + esc(o.id) + '"><img src="' + esc(o.slika) + '" alt=""><span class="ponuda-tekst">' +
          '<span class="ime">' + esc(o.naziv) + '</span><span class="tekst" style="font-size:15px">' + esc(o.podnaslov || "") + "</span>" +
          '<span class="cena">' + (imam ? "Već je tvoj" : esc(o.cena || "") + (o.cenaRate ? " ili " + esc(o.cenaRate) : "")) + "</span></span>" + STRELICA + "</a>";
      }).join("") + "</section>" +
      (korisnik ? "" : '<p class="tiho okvir" style="text-align:center;padding-top:28px">Već imaš program? <a href="#/">Uđi u Prostor</a></p>') +
      "</main>" + (korisnik ? meni("soba") : "");
    app.innerHTML = h;
  }
  function ekranPonudaJedna(o, pristup) {
    var imam = pristup.indexOf(o.id) >= 0;
    var otvori = program(o.id) ? "#/program/" + o.id : "#/biblioteka/" + o.id;
    var dobijas = String(o.dobijas || "").split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    var dugme = imam ? '<a class="dugme" href="' + otvori + '">Otvori, već je tvoj</a>'
      : (o.kupi ? '<a class="dugme" href="' + esc(o.kupi) + '">' + (o.kupiRate ? "Plati odjednom · " : "Kupi · ") + esc(o.cena || "") + "</a>" : "") +
        (o.kupiRate ? '<a class="dugme obrub" href="' + esc(o.kupiRate) + '">Na rate · ' + esc(o.cenaRate || "") + "</a>" : "") +
        (!o.kupi && !o.kupiRate ? '<span class="dugme obrub" aria-disabled="true" style="opacity:.6;cursor:default">Uskoro</span>' : "");
    app.innerHTML = '<main class="ekran ponuda' + (korisnik ? "" : " bez-menija") + '">' + demoTraka() + vrhPonude() +
      '<div class="ponuda-slika"><img src="' + esc(o.slika) + '" alt=""></div>' +
      '<div class="okvir pozdrav"><a class="malo-dugme" href="#/ponuda">← Svi programi</a><h1>' + esc(o.naziv) + "</h1>" +
      (o.podnaslov ? '<p class="tekst" style="font-family:var(--serif);font-style:italic;font-size:22px;color:var(--pl)">' + esc(o.podnaslov) + "</p>" : "") + "</div>" +
      '<div class="dve-kolone okvir"><div class="glavno kolona">' +
      (o.zaKoga ? '<section><div class="nadnaslov">Za koga je</div><p class="tekst">' + esc(o.zaKoga) + "</p></section>" : "") +
      (o.opis ? '<section><div class="nadnaslov">Kako izgleda</div><p class="tekst">' + esc(o.opis) + "</p></section>" : "") +
      (dobijas.length ? '<section><div class="nadnaslov">Šta dobijaš</div><ul class="ponuda-dobijas">' + dobijas.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" : "") +
      '</div><aside class="strana kolona"><section class="ponuda-kupi">' +
      '<span class="cena-velika">' + esc(o.cena || "") + "</span>" + (o.cenaRate ? '<span class="tiho">ili ' + esc(o.cenaRate) + "</span>" : "") +
      (o.nacin ? '<p class="tiho">' + esc(o.nacin) + "</p>" : "") + dugme +
      (imam ? "" : '<ol class="ponuda-koraci"><li>Plaćaš karticom preko sigurne stranice za plaćanje.</li><li>Za minut ti stiže mejl „Tvoj Prostor je otvoren”.</li><li>Klikneš na dugme u mejlu i ulaziš. Lozinka ti ne treba.</li></ol>' +
        '<p class="tiho">Imaš kod za popust? Upisuješ ga na stranici za plaćanje.' + (o.pretplata ? " Pretplatu otkazuješ kad želiš." : "") + "</p>") +
      '<p class="tiho">Pitanja: <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a></p></section></aside></div></main>" + (korisnik ? meni("soba") : "");
  }
  function ekranHvala() {
    app.innerHTML = '<main class="ekran bez-menija">' + demoTraka() + vrhPonude() +
      '<div class="okvir" style="padding-top:56px;display:flex;flex-direction:column;gap:18px;max-width:560px">' +
      '<div class="nadnaslov">Uplata je prošla</div><h1>Hvala ti. <em>Tvoj Prostor se otvara.</em></h1>' +
      '<p class="tekst">Za minut ti na mejl stiže poruka „Tvoj Prostor je otvoren”. Klikni na dugme u njoj i ulaziš pravo unutra, lozinka ti ne treba.</p>' +
      '<p class="tiho">Ako mejl ne stigne za pet minuta, pogledaj u Promocije ili Spam. Ako ga ni tamo nema, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</p>" +
      (korisnik ? '<a class="dugme" href="#/">Idi u Prostor</a>' : "") + "</div></main>" + (korisnik ? meni("soba") : "");
  }

  function ekranZatvoreno(p) {
    app.innerHTML = '<main class="ekran">' + zaglavlje() + '<div class="okvir" style="padding-top:44px;display:flex;flex-direction:column;gap:18px">' +
      '<div class="nadnaslov">' + esc(p ? p.naziv : "Program") + "</div><h1>Ova prostorija <em>još nije tvoja.</em></h1>" +
      '<p class="tekst">' + (clanstvo(p) ? "Kutak se otvara uz članarinu. Svakog meseca ovde stiže novi video i tekstovi koje čitaš svojim tempom." : "Program nije otvoren na mejlu sa kojim si ušao.") +
      ' Ako si ga kupio sa drugim mejlom, odjavi se i uđi sa njim. Ako ne uspe, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + '</a>.</p>' +
      '<a class="dugme" href="#/ponuda/' + esc(p ? p.id : "") + '">Pogledaj program</a></div></main>' + meni("soba");
  }

  var pauzaPrikazana = {};
  function ekranModul(p, m, pristup, napredak) {
    if (pristup.indexOf(p.id) < 0) return ekranZatvoreno(p);
    if (zakljucan(p, m)) { location.hash = "#/program/" + p.id; return; }
    var kljuc = p.id + "/" + m.id;
    if (!pauzaPrikazana[kljuc]) {
      app.innerHTML = '<main class="pauza"><div class="krug-okvir" aria-hidden="true"><div class="krug"></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:14px;align-items:center"><div class="nadnaslov">' + esc(oznaka(p, m)) + "</div>" +
        '<h1 style="font-size:42px">Pre nego što <em>počneš</em></h1><p class="tekst">Tri spora udaha, prati krug.<br>Spusti ramena. Ovde nema žurbe.</p></div>' +
        '<div style="width:100%;display:flex;flex-direction:column;gap:6px"><button class="dugme" id="spreman">Spreman sam</button><button class="tihi-link" id="preskoci">Preskoči</button></div></main>';
      var dalje = function () { pauzaPrikazana[kljuc] = true; ekranModul(p, m, pristup, napredak); window.scrollTo(0, 0); };
      document.getElementById("spreman").addEventListener("click", dalje);
      document.getElementById("preskoci").addEventListener("click", dalje);
      document.getElementById("spreman").focus();
      return;
    }
    var x = napredak[kljuc] || {};
    var i = p.moduli.indexOf(m), sledeci = p.moduli[i + 1];
    var sveska = (p.uzProgram || []).filter(function (u) { return /sveska|dnevnik/i.test(u.naziv) && link(u.link); })[0];
    var mapa = link(p.mapa);
    var h = '<main class="ekran modul">' + demoTraka() + '<div class="okvir modul-glava">' +
      '<a class="malo-dugme" href="#/program/' + p.id + '">← ' + esc(p.naziv) + "</a>" +
      '<div style="display:flex;flex-direction:column;gap:12px"><div class="nadnaslov">' + esc(oznaka(p, m)) + "</div><h1>" + esc(m.naziv) + "</h1>" +
      (m.podnaslov ? '<p class="tekst">' + esc(m.podnaslov) + "</p>" : "") + "</div></div>" +
      '<div class="dve-kolone okvir"><div class="glavno kolona">';
    h += '<section style="display:flex;flex-direction:column;gap:10px" aria-label="Video"><div class="video">' +
      (m.vimeo ? videoOkvir(m.vimeo, m.naziv, "vimeo")
        : '<img src="' + p.slika + '" alt=""><div class="prazno">Video uskoro</div>') + "</div>" +
      '<span class="tiho" id="vreme">' + (x.gotovo ? "Odgledano" : x.pozicija ? "Nastavljaš od " + vreme(x.pozicija) : m.trajanje ? "Trajanje " + esc(m.trajanje) : "") + "</span></section>";
    if (m.fantazija) h += '<section style="display:flex;flex-direction:column;gap:10px" aria-label="Vođena fantazija"><div class="nadnaslov">Vođena fantazija</div><div class="video">' +
      videoOkvir(m.fantazija, "Vođena fantazija") + "</div>" +
      '<span class="tiho">Sedi ili lezi udobno. Slušaj kad imaš mir i niko te ne prekida.</span></section>';
    if (m.pismo) h += '<section class="pismo" aria-label="Reč od Milice"><div class="glava"><img src="slike/milica.jpg" alt="Milica Bilbija"><span><span class="nadnaslov" style="font-size:10px">Pre videa</span>' +
      '<span style="display:block;font-family:var(--serif);font-size:19px;color:var(--ink)">Reč od Milice</span></span></div><p class="tekst">' + esc(m.pismo) + '</p><span class="potpis">Milica</span></section>';
    h += '</div><aside class="strana kolona">';
    var uz = "";
    if (link(m.sveska)) uz += '<a class="red" href="' + esc(link(m.sveska)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:20px">Radna sveska</span><span class="pod">PDF · za ovaj modul</span></span>' + STRELICA + "</a>";
    else if (sveska) uz += '<a class="red" href="' + esc(link(sveska.link)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:20px">' + esc(sveska.naziv) + '</span><span class="pod">PDF · strana modula ' + esc(m.id) + "</span></span>" + STRELICA + "</a>";
    if (mapa) uz += '<a class="red" href="' + esc(mapa) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:20px">Mapa pojmova</span><span class="pod">Kad naiđeš na reč koju ne razumeš</span></span>' + STRELICA + "</a>";
    if (m.zadatak) uz += '<div class="red" style="display:block"><span class="naziv" style="font-size:20px">' + (clanstvo(p) ? "Za ovaj mesec" : "Zadatak za ovu nedelju") + '</span><span class="pod" style="font-size:14px;color:var(--tx);margin-top:6px">' + esc(m.zadatak) + "</span></div>";
    if (uz) h += '<section aria-label="Uz modul"><div class="nadnaslov">' + (clanstvo(p) ? "Uz ovaj mesec" : "Uz modul") + '</div>' + uz + "</section>";
    if (m.trebalo || m.recenica) h += '<section class="trebalo" aria-label="Šta ti je tada trebalo"><div class="nadnaslov">Šta ti je tada trebalo</div>' +
      (m.trebalo ? '<p class="tekst">' + esc(m.trebalo) + "</p>" : "") + (m.recenica ? '<p class="recenica">„' + esc(m.recenica) + '”</p>' : "") + "</section>";
    h += '<div style="display:flex;flex-direction:column;gap:6px">' +
      (x.gotovo ? (sledeci && !clanstvo(p) && !zakljucan(p, sledeci) ? '<a class="dugme" href="#/modul/' + p.id + "/" + sledeci.id + '">Sledeći modul</a>' : "")
        : '<button class="dugme" id="gotovo">' + (clanstvo(p) ? "Pogledao sam ovaj mesec" : "Odgledao sam ovaj modul") + '</button>') +
      '<a class="tihi-link" href="#/">Završio sam za danas</a></div></aside></div></main>' + meni("soba");
    app.innerHTML = h;
    var dg = document.getElementById("gotovo");
    if (dg) dg.addEventListener("click", function () {
      dg.disabled = true;
      baza.sacuvajNapredak(p.id, m.id, { gotovo: true }).then(function () { location.hash = "#/program/" + p.id; });
    });
    var okvir = document.getElementById("vimeo");
    if (okvir && window.Vimeo) {
      var plejer = new Vimeo.Player(okvir), posl = 0;
      if (x.pozicija && !x.gotovo) plejer.setCurrentTime(x.pozicija).catch(function () {});
      plejer.on("timeupdate", function (d) {
        if (d.seconds - posl > 15 || d.seconds < posl) { posl = d.seconds; baza.sacuvajNapredak(p.id, m.id, { pozicija: Math.floor(d.seconds) }); }
      });
      plejer.on("pause", function (d) { baza.sacuvajNapredak(p.id, m.id, { pozicija: Math.floor(d.seconds) }); });
      plejer.on("ended", function () { baza.sacuvajNapredak(p.id, m.id, { gotovo: true, pozicija: 0 }); });
    }
  }

  function ekranDnevnik(stranice, otvorenaId) {
    var otvorena = stranice.filter(function (s) { return s.id === otvorenaId; })[0];
    var danasnja = stranice.filter(function (s) { return s.datum === danas(); })[0];
    var tr = otvorena || danasnja || { id: null, datum: danas(), tekst: "" };
    var ranije = stranice.filter(function (s) { return s.id !== tr.id && (s.tekst || "").trim(); });
    var h = '<main class="ekran dnevnik">' + demoTraka() + zaglavlje() + '<div class="okvir pozdrav">' +
      '<div class="nadnaslov">Samo tvoj</div><h1 style="font-size:52px">Moj <em>dnevnik</em></h1>' +
      '<p class="tekst">Ovde nema zadataka ni pitanja. Piši šta god želiš da zabeležiš o sebi.</p></div>' +
      '<div class="dve-kolone"><section class="stranica" aria-label="Stranica dnevnika"><span class="datum">' + lepDatum(tr.datum) + "</span>" +
      '<label for="stranica" class="vidljivo-citacu">Tvoja stranica</label><textarea id="stranica" placeholder="Počni gde god želiš...">' + esc(tr.tekst) + "</textarea>" +
      '<div style="display:flex;justify-content:space-between;align-items:center"><span class="tiho" id="stanje" role="status">' + (tr.tekst ? "Sačuvano" : "Čuva se samo od sebe") + "</span>" +
      (otvorena && otvorena.datum !== danas() ? '<a class="malo-dugme" style="color:var(--pl)" href="#/dnevnik">Današnja stranica</a>' : "") + "</div></section>";
    h += '<aside class="strana">';
    if (ranije.length) h += '<section class="okvir blok" aria-label="Ranije stranice"><div class="nadnaslov">Ranije stranice</div>' +
      ranije.map(function (s) { return '<button class="unos" data-id="' + esc(s.id) + '"><span class="d">' + lepDatum(s.datum) + '</span><span class="t">' + esc(s.tekst) + "</span></button>"; }).join("") + "</section>";
    h += "</aside></div></main>" + meni("dnevnik");
    app.innerHTML = h;
    var polje = document.getElementById("stranica"), stanje = document.getElementById("stanje"), tajmer = null, cuvanje = Promise.resolve();
    polje.addEventListener("input", function () {
      stanje.textContent = "Pišeš...";
      clearTimeout(tajmer);
      tajmer = setTimeout(function () {
        tr.tekst = polje.value;
        cuvanje = cuvanje.then(function () { return baza.sacuvajStranicu(tr); }).then(function (s) { tr.id = s.id; stanje.textContent = "Sačuvano"; })
          .catch(function (e) { console.error(e); stanje.textContent = "Nije sačuvano. Proveri internet."; });
      }, 900);
    });
    app.querySelectorAll(".unos").forEach(function (b) { b.addEventListener("click", function () { location.hash = "#/dnevnik/" + b.dataset.id; }); });
  }

  function ekranBiblioteka(pristup, otvoriId) {
    // Urednik vidi sve snimke (i one koje još niko nije kupio), da može da ih proveri.
    var stavke = S.biblioteka.filter(function (b) { return JE_UREDNIK || pristup.indexOf(b.program) >= 0; });
    var otvorena = stavke.filter(function (b) { return b.id === otvoriId; })[0];
    var h = '<main class="ekran biblioteka">' + demoTraka() + '<div class="bib-slika"><img src="' + (otvorena ? otvorena.slika : "slike/biblioteka.jpg") + '" alt=""></div>' +
      '<div class="okvir pozdrav"><div class="nadnaslov">Biblioteka</div>' +
      '<h1 style="font-size:42px">Za večeri kad ti <em>treba mir</em></h1><p class="tekst">Slušaj sa slušalicama, u tišini.</p></div>';
    if (otvorena) h += '<section class="okvir blok otvoreno" style="display:flex;flex-direction:column;gap:10px"><div class="video">' +
      (otvorena.vimeo ? videoOkvir(otvorena.vimeo, otvorena.naziv)
        : '<img src="' + otvorena.slika + '" alt=""><div class="prazno">Snimak uskoro</div>') + '</div><span class="tiho">' + esc(otvorena.naziv) + "</span>" +
      (link(otvorena.pdf) ? '<a class="dugme obrub" style="align-self:flex-start" href="' + esc(link(otvorena.pdf)) + '" target="_blank" rel="noopener">Otvori uputstvo (PDF)</a>' : "") + "</section>";
    h += '<div class="dve-kolone"><section class="okvir blok glavno" aria-label="Relaksacije"><div class="nadnaslov">Relaksacije</div>' +
      (stavke.length ? stavke.map(function (b) {
        return '<a class="red" href="#/biblioteka/' + b.id + '"><span style="width:46px;height:46px;border-radius:50%;border:1px solid var(--pl);display:flex;align-items:center;justify-content:center;flex:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="#3D2440" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>' +
          '<span style="flex:1"><span class="naziv" style="font-size:22px">' + esc(b.naziv) + '</span><span class="pod">' + esc(b.opis) + (JE_UREDNIK && pristup.indexOf(b.program) < 0 ? " · vidiš kao urednik" : "") + "</span></span></a>";
      }).join("") : '<p class="tekst" style="padding-top:12px">Ovde će biti relaksacije iz tvojih programa.</p>') + "</section>";
    var mape = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0 && link(p.mapa); });
    h += '<aside class="strana">';
    h += '<section class="okvir blok" aria-label="Kutak za čitanje"><div class="nadnaslov">Kutak za čitanje</div><a class="red" href="#/citanje"><span style="flex:1"><span class="naziv" style="font-size:22px">Tekstovi za članove</span><span class="pod">Pomoć i samopomoć</span></span>' + STRELICA + "</a>" +
      '<a class="red" href="#/blog"><span style="flex:1"><span class="naziv" style="font-size:22px">Blog</span><span class="pod">Javni tekstovi</span></span>' + STRELICA + "</a></section>";
    if (mape.length) h += '<section class="okvir blok" aria-label="Za čitanje"><div class="nadnaslov">Za čitanje</div>' +
      mape.map(function (p) { return '<a class="red" href="' + esc(link(p.mapa)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:22px">Mapa pojmova</span><span class="pod">' + esc(p.naziv) + "</span></span>" + STRELICA + "</a>"; }).join("") + "</section>";
    h += "</aside></div></main>" + meni("bib");
    app.innerHTML = h;
  }

  /* ---------- Uređivanje (samo urednici) ---------- */
  var RIM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  var SLIKE = [["slike/cvetovi.jpg", "Cvetovi (Koren)"], ["slike/more.jpg", "More (Povratak sebi)"], ["slike/relaksacija.jpg", "Relaksacija"], ["slike/mesecna.jpg", "Svetlo i senka (Kutak)"], ["slike/biblioteka.jpg", "Večernje svetlo (Biblioteka)"], ["slike/cvetovi-u-plavom.jpg", "Cvetovi u plavom"], ["slike/sumrak-na-moru.jpg", "Sumrak na moru"], ["slike/plavo-cvece.jpg", "Plavo cveće"], ["slike/svetla-u-sumrak.jpg", "Svetla u sumrak"], ["slike/breskva-i-magla.jpg", "Breskva i magla"], ["slike/sljiva-i-plavo.jpg", "Šljiva i plavo"], ["slike/milica.jpg", "Milica"]];
  function nazivPrograma(id) { var p = PROGRAMI_SVI().filter(function (x) { return x.id === id; })[0]; return p ? p.naziv : id; }
  function polje(id, oznaka, vrednost, vrsta, pomoc) {
    var v = esc(vrednost == null ? "" : vrednost);
    var unos = vrsta === "dugo" ? '<textarea id="' + id + '" rows="4">' + v + "</textarea>"
      : '<input id="' + id + '" type="' + (vrsta || "text") + '" value="' + v + '">';
    return '<div class="polje-ured"><label for="' + id + '">' + oznaka + "</label>" + unos + (pomoc ? '<span class="tiho">' + pomoc + "</span>" : "") + "</div>";
  }
  function izbor(id, oznaka, opcije, izabrano) {
    return '<div class="polje-ured"><label for="' + id + '">' + oznaka + '</label><select id="' + id + '">' +
      opcije.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === izabrano ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
  }
  function vr(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function poljeFajl(id, oznaka, vrednost, folder, prihvata, pomoc) {
    var info = jeFajl(vrednost) ? "Fajl je u Prostoru: " + imeFajla(vrednost) : (pomoc || "");
    return '<div class="polje-ured"><label for="' + id + '">' + oznaka + '</label><div class="fajl-red"><input id="' + id + '" type="text" value="' + esc(vrednost || "") + '">' +
      '<label class="dugme obrub fajl-dugme">Otpremi fajl<input type="file" accept="' + prihvata + '" data-za="' + id + '" data-folder="' + esc(folder) + '" hidden></label></div>' +
      '<span class="tiho" id="' + id + '-stanje">' + esc(info) + "</span></div>";
  }
  function povezOtpremanje(mesto) {
    mesto.querySelectorAll("input[type=file][data-za]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0]; if (!f) return;
        var st = document.getElementById(inp.dataset.za + "-stanje");
        inp.value = "";
        if (f.size > 50 * 1024 * 1024) { st.textContent = "Fajl je veći od 50 MB. Smanji ga ili video postavi na YouTube ili Vimeo."; return; }
        st.textContent = "Otpremam " + f.name + "... ne zatvaraj stranicu.";
        baza.otpremiFajl(f, inp.dataset.folder).then(function (pt) {
          document.getElementById(inp.dataset.za).value = "fajl:" + pt;
          st.textContent = "Otpremljeno: " + f.name + ". Sad klikni Sačuvaj.";
        }).catch(function (e) { console.error(e); st.textContent = "Nije otpremljeno: " + (e.message || e); });
      });
    });
  }
  function javi(tekst, greska) { var el = document.getElementById("javi"); if (el) { el.textContent = tekst; el.className = "javi" + (greska ? " greska" : ""); } }

  function ekranUredjivanje(tab) {
    var tabovi = [["pregled", "Pregled"], ["polaznici", "Polaznici"], ["sadrzaj", "Sadržaj"], ["biblioteka", "Biblioteka"], ["tekstovi", "Tekstovi"], ["naslovna", "Naslovna"], ["ponuda", "Ponuda"], ["promocija", "Promocija"], ["kuponi", "Kuponi"]];
    app.innerHTML = '<main class="ekran ured">' + demoTraka() + zaglavlje() +
      '<div class="okvir pozdrav"><div class="nadnaslov">Samo za tebe</div><h1>Ure<em>đivanje</em></h1></div>' +
      '<nav class="ured-tabovi okvir" aria-label="Delovi uređivanja">' + tabovi.map(function (t) {
        return '<a href="#/uredjivanje/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + ">" + t[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="okvir" id="ured-sadrzaj"><p class="tiho">Učitavam...</p></div><p id="javi" class="javi" role="status"></p></main>' + meni("ured");
    var mesto = document.getElementById("ured-sadrzaj");
    var f = { pregled: uredPregled, polaznici: uredPolaznici, sadrzaj: uredSadrzaj, biblioteka: uredBiblioteka, tekstovi: uredTekstovi, naslovna: uredNaslovna, ponuda: uredPonuda, promocija: uredPromocija, kuponi: uredKuponi }[tab] || uredPregled;
    Promise.resolve(f(mesto)).catch(function (e) { console.error(e); mesto.innerHTML = '<div class="poruka">Nije učitano. Osveži stranicu.</div>'; });
  }

  function uredPregled(mesto) {
    return baza.pregled().then(function (redovi) {
      var aktivni = redovi.filter(function (x) { return x.aktivan; });
      var poProgramu = PROGRAMI_SVI().map(function (p) { return [p.naziv, aktivni.filter(function (x) { return x.program === p.id; }).length]; });
      var daleko = aktivni.filter(function (x) { return x.udaljava_se; });
      var ljudi = {}; aktivni.forEach(function (x) { ljudi[x.email] = 1; });
      mesto.innerHTML = '<div class="ured-brojevi"><div class="broj-kartica"><span class="tiho">Aktivni polaznici</span><strong>' + Object.keys(ljudi).length + "</strong></div>" +
        poProgramu.map(function (p) { return '<div class="broj-kartica"><span class="tiho">' + esc(p[0]) + "</span><strong>" + p[1] + "</strong></div>"; }).join("") + "</div>" +
        (daleko.length ? '<section class="ured-blok tiho-zlato"><div class="nadnaslov">Nisu ušli 14 dana</div><p class="tekst">Ako želiš, napiši im lično.</p>' +
          daleko.map(function (x) { return '<div class="ured-red"><span>' + esc(x.email) + '</span><span class="tiho">' + esc(nazivPrograma(x.program)) + "</span></div>"; }).join("") + "</section>" : "") +
        '<section class="ured-blok"><div class="nadnaslov">Svi polaznici</div>' + (redovi.length ? redovi.map(function (x) {
          return '<div class="ured-red"><span><strong>' + esc(x.email) + '</strong><br><span class="tiho">' + esc(nazivPrograma(x.program)) + (x.aktivan ? "" : " · zatvoren") + "</span></span>" +
            '<span class="tiho" style="text-align:right">' + (x.poslednja_aktivnost ? "Poslednji put " + lepDatum(String(x.poslednja_aktivnost).slice(0, 10)) : "Još nije ušao") +
            "<br>Odgledano modula: " + (x.odgledano_modula || 0) + "</span></div>";
        }).join("") : '<p class="tekst">Još nema polaznika.</p>') + "</section>" + '<div id="odgovori"></div>';
      baza.sviUpitnici().then(function (u) {
        var popunjeni = u.filter(function (x) { return x.odgovori && !x.odgovori.preskocio; });
        if (!popunjeni.length) return;
        var izvori = { instagram: "Instagram", preporuka: "Preporuka", sajt: "Sajt", drugo: "Drugo" };
        document.getElementById("odgovori").innerHTML = '<section class="ured-blok"><div class="nadnaslov">Odgovori pri prvom ulasku</div>' +
          popunjeni.map(function (x) {
            var o = x.odgovori;
            return '<div class="ured-red kolona-red"><span><strong>' + esc(o.ime || x.email) + '</strong> <span class="tiho">' + esc(x.email) + " · " + esc(izvori[o.izvor] || "") + " · " + lepDatum(String(x.napravljeno).slice(0, 10)).toLowerCase() + "</span></span>" +
              (o.dovodi ? '<span class="tekst" style="font-size:15px"><em>Šta ga dovodi:</em> ' + esc(o.dovodi) + "</span>" : "") +
              (o.promena ? '<span class="tekst" style="font-size:15px"><em>Šta želi da se promeni:</em> ' + esc(o.promena) + "</span>" : "") + "</div>";
          }).join("") + "</section>";
      }).catch(function (e) { console.error(e); });
    });
  }

  function mesecnaKontrola(x) {
    var p = program(x.program);
    if (!p || !p.mesecno || !x.aktivan) return "";
    var ukupno = p.moduli.length, n = x.uplate == null ? ukupno : Math.min(x.uplate, ukupno);
    var dugme = function (v, t, opis) { return '<button class="malo-dugme" style="border:1px solid var(--bd);min-width:36px;height:32px;padding:0;justify-content:center;font-size:16px;color:var(--pl)" data-uplate="' + v + '" data-mejl="' + esc(x.email) + '" data-prog="' + esc(x.program) + '" aria-label="' + opis + '">' + t + "</button>"; };
    return '<span class="tiho" style="display:inline-flex;align-items:center;gap:8px">Moduli ' + n + "/" + ukupno +
      (n > 1 ? dugme(n - 1, "−", "Zatvori jedan modul") : "") + (n < ukupno ? dugme(n + 1, "+", "Otvori sledeći modul") : "") +
      (x.izvor === "polar" ? " · otvara se sa uplatom" : "") + "</span>";
  }
  function uredPolaznici(mesto) {
    return baza.sviPristupi().then(function (sve) {
      var poMejlu = {}; sve.forEach(function (x) { (poMejlu[x.email] = poMejlu[x.email] || []).push(x); });
      mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Otvori pristup</div>' +
        polje("novi-mejl", "Mejl polaznika", "", "email", "Isti mejl kojim je platio. Polaznik ulazi preko linka na taj mejl.") +
        '<fieldset class="polje-ured"><legend>Programi</legend>' + PROGRAMI_SVI().map(function (p) {
          return '<label class="cek"><input type="checkbox" name="prog" value="' + esc(p.id) + '"> ' + esc(p.naziv) + "</label>"; }).join("") + "</fieldset>" +
        polje("novi-uplate", "Koliko modula mu je otvoreno (prazno = svi)", "", "number", "Za one koji plaćaju na rate van Polar-a. Uz Koren i Povratak sebi automatski ide 6 meseci Kutka i pristup na 3 godine.") +
        '<button class="dugme" id="dodaj">Otvori pristup</button></section>' +
        '<section class="ured-blok"><div class="nadnaslov">Polaznici i programi</div>' + (Object.keys(poMejlu).length ? Object.keys(poMejlu).map(function (m) {
          return '<div class="ured-red kolona-red"><strong>' + esc(m) + '</strong><div class="cipovi">' + poMejlu[m].map(function (x) {
            return '<button class="cip' + (x.aktivan ? " uklj" : "") + '" data-mejl="' + esc(x.email) + '" data-prog="' + esc(x.program) + '" data-akt="' + (x.aktivan ? 1 : 0) + '" aria-pressed="' + (x.aktivan ? "true" : "false") + '">' +
              esc(nazivPrograma(x.program)) + " · " + (x.aktivan ? "otvoreno" : "zatvoreno") + "</button>" + mesecnaKontrola(x); }).join("") + "</div></div>";
        }).join("") : '<p class="tekst">Još nema polaznika.</p>') + '<p class="tiho">Klik na program otvara ili zatvara pristup.</p></section>';
      document.getElementById("dodaj").addEventListener("click", function () {
        var mejl = vr("novi-mejl"); var progs = Array.prototype.map.call(document.querySelectorAll('input[name="prog"]:checked'), function (c) { return c.value; });
        if (!/^\S+@\S+\.\S+$/.test(mejl)) return javi("Upiši ispravan mejl.", true);
        if (!progs.length) return javi("Izaberi bar jedan program.", true);
        var upRaw = parseInt(vr("novi-uplate"), 10);
        var up = upRaw > 0 ? Math.min(upRaw, 99) : null;
        baza.dodajPristup(mejl, progs, up).then(function () { javi("Pristup je otvoren za " + mejl + "."); uredPolaznici(mesto); }).catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
      });
      mesto.querySelectorAll("[data-uplate]").forEach(function (b) {
        b.addEventListener("click", function () {
          var n = Math.max(1, parseInt(b.dataset.uplate, 10));
          baza.postaviUplate(b.dataset.mejl, b.dataset.prog, n).then(function () { javi("Otvoreno modula: " + n + "."); uredPolaznici(mesto); })
            .catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
        });
      });
      mesto.querySelectorAll(".cip").forEach(function (b) {
        b.addEventListener("click", function () {
          var novo = b.dataset.akt !== "1";
          baza.promeniPristup(b.dataset.mejl, b.dataset.prog, novo).then(function () { javi(novo ? "Pristup otvoren." : "Pristup zatvoren."); uredPolaznici(mesto); })
            .catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
        });
      });
    });
  }

  var izabraniProgram = null;
  function uredSadrzaj(mesto) {
    var kopija = JSON.parse(JSON.stringify(S));
    var p = kopija.programi.filter(function (x) { return x.id === izabraniProgram; })[0] || kopija.programi[0];
    izabraniProgram = p.id;
    var sveska = (p.uzProgram || []).filter(function (u) { return /sveska|dnevnik/i.test(u.naziv); })[0];
    var polja = clanstvo(p) ? [["mesec", "Mesec", "text", "npr. Decembar 2026"], ["naziv", "Naslov meseca"], ["podnaslov", "Podnaslov"], ["vimeo", "Video (Vimeo ili YouTube)", "text", "Nalepi link sa Vimea ili YouTube-a (Unlisted)"], ["trajanje", "Trajanje", "text", "npr. 20 min"],
      ["pismo", "Tekst za ovaj mesec", "dugo", "Tekst za pomoć i istraživanje sebe. Prazan red pravi novi pasus."], ["zadatak", "Vežba za ovaj mesec", "dugo"]] : [["naziv", "Naziv modula"], ["podnaslov", "Podnaslov"], ["vimeo", "Video (Vimeo ili YouTube)", "text", "Nalepi link sa Vimea ili YouTube-a (Unlisted)"], ["trajanje", "Trajanje", "text", "npr. 24 min"],
      ["fantazija", "Vođena fantazija (Vimeo ili YouTube link)", "text", "Prazno = ovaj modul nema fantaziju"], ["sveska", "Radna sveska za ovaj modul (link do PDF-a)", "url"],
      ["pismo", "Tvoje pismo pre videa", "dugo"], ["zadatak", "Zadatak za ovu nedelju", "dugo"], ["trebalo", "Šta ti je tada trebalo", "dugo"], ["recenica", "Rečenica na kraju", "text"]];
    mesto.innerHTML = '<div class="cipovi" style="margin-bottom:24px">' + kopija.programi.map(function (x) {
        return '<button class="cip' + (x.id === p.id ? " uklj" : "") + '" data-izaberi="' + esc(x.id) + '">' + esc(x.naziv) + "</button>"; }).join("") + "</div>" +
      '<section class="ured-blok forma-ured"><div class="nadnaslov">Program</div>' +
      polje("p-naziv", "Naziv programa", p.naziv) + polje("p-kratko", "Kratak opis", p.kratko, "text", "Piše ispod naziva u Prostoru, npr. 9 modula") +
      polje("p-citat", "Citat u prostoriji", p.citat, "dugo") + polje("p-uvod", "Pismo pre početka (prva stvar koju polaznik vidi u programu)", p.uvod, "dugo") +
      poljeFajl("p-uvodpdf", "Pismo kao PDF (nije obavezno)", p.uvodPdf, p.id, "application/pdf", "Otpremi PDF ili nalepi link.") + polje("p-prodaja", "Link prodajne stranice (za one koji nemaju program)", p.prodaja, "url") + poljeFajl("p-sveska", "PDF za ceo program (Dnevnik korena ili radna sveska)", sveska ? sveska.link : "", p.id, "application/pdf", "Otpremi PDF ili nalepi link.") + "</section>" +
      '<section class="ured-blok"><div class="nadnaslov">' + (clanstvo(p) ? "Meseci" : "Moduli") + '</div>' + p.moduli.map(function (m, i) {
        return '<details class="modul-ured"' + (i === 0 ? "" : "") + "><summary><span class=\"broj\">" + esc(clanstvo(p) ? "" : m.rim) + "</span> " + esc((clanstvo(p) && m.mesec ? m.mesec + " · " : "") + m.naziv) + (m.vimeo ? "" : ' <span class="tiho">· bez videa</span>') + "</summary>" +
          '<div class="forma-ured">' + polja.map(function (pl) {
            if (pl[0] === "fantazija") return poljeFajl("m" + i + "-fantazija", "Vođena fantazija", m.fantazija, p.id, "audio/*", "Otpremi mp3 ili m4a, ili nalepi YouTube, Vimeo ili Drive link. Prazno = ovaj modul nema fantaziju.");
            if (pl[0] === "sveska") return poljeFajl("m" + i + "-sveska", "Radna sveska za ovaj modul (PDF)", m.sveska, p.id, "application/pdf", "Otpremi PDF ili nalepi link.");
            return polje("m" + i + "-" + pl[0], pl[1], m[pl[0]], pl[2], pl[3]); }).join("") +
          '<button class="tihi-link ukloni" data-i="' + i + '">' + (clanstvo(p) ? "Ukloni ovaj mesec" : "Ukloni ovaj modul") + '</button></div></details>';
      }).join("") + '<button class="dugme obrub" id="novi-modul" style="margin-top:20px">' + (clanstvo(p) ? "Dodaj novi mesec" : "Dodaj modul") + '</button></section>' +
      '<div class="ured-sacuvaj"><button class="dugme" id="sacuvaj-sadrzaj">Sačuvaj sadržaj</button></div>';
    function procitaj() {
      p.naziv = vr("p-naziv") || p.naziv; p.kratko = vr("p-kratko"); p.citat = vr("p-citat"); p.uvod = vr("p-uvod"); p.uvodPdf = vr("p-uvodpdf"); p.prodaja = vr("p-prodaja");
      var link = vr("p-sveska");
      if (sveska) sveska.link = link;
      else if (link) { p.uzProgram = p.uzProgram || []; p.uzProgram.unshift({ naziv: p.id === "koren" ? "Dnevnik korena" : "Radna sveska", opis: "PDF", link: link }); }
      p.moduli.forEach(function (m, i) { polja.forEach(function (pl) { var el = document.getElementById("m" + i + "-" + pl[0]); if (el) m[pl[0]] = el.value.trim(); }); });
    }
    povezOtpremanje(mesto);
    mesto.querySelectorAll("[data-izaberi]").forEach(function (b) { b.addEventListener("click", function () { izabraniProgram = b.dataset.izaberi; uredSadrzaj(mesto); }); });
    document.getElementById("novi-modul").addEventListener("click", function () {
      procitaj(); var n = p.moduli.length;
      p.moduli.push({ id: String(n + 1).padStart(2, "0"), rim: RIM[n] || String(n + 1), mesec: "", naziv: clanstvo(p) ? "Novi mesec" : "Novi modul", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" });
      S = kopija; uredSadrzaj(mesto); javi((clanstvo(p) ? "Mesec je dodat." : "Modul je dodat.") + " Popuni ga i klikni Sačuvaj sadržaj.");
    });
    mesto.querySelectorAll(".ukloni").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.potvrda !== "1") { b.dataset.potvrda = "1"; b.textContent = "Klikni još jednom da ukloniš modul"; return; }
        procitaj(); p.moduli.splice(+b.dataset.i, 1);
        p.moduli.forEach(function (m, i) { m.rim = RIM[i] || String(i + 1); });
        S = kopija; uredSadrzaj(mesto); javi("Modul je uklonjen. Klikni Sačuvaj sadržaj da ostane tako.");
      });
    });
    document.getElementById("sacuvaj-sadrzaj").addEventListener("click", function () {
      procitaj();
      baza.sacuvajSadrzaj(kopija).then(function () { S = kopija; window.SOBA_SADRZAJ = S; javi("Sačuvano. Polaznici odmah vide promene."); })
        .catch(function (e) { console.error(e); javi("Nije sačuvano. Proveri internet i probaj ponovo.", true); });
    });
  }

  var izabraniTekst = null;
  function uredTekstovi(mesto) {
    baza.sviTekstovi().then(function (lista) {
      var t = lista.filter(function (x) { return x.id === izabraniTekst; })[0] ||
        { id: null, naslov: "", sazetak: "", telo: "", slika: "", vidljivost: "kutak", objavljeno: false, datum: new Date().toISOString() };
      mesto.innerHTML = '<p class="tiho" style="margin-bottom:20px">Blog čita svako, i bez prijave. Kutak za čitanje vide samo članovi Kutka.</p>' +
        '<div class="cipovi" style="margin-bottom:24px"><button class="cip' + (t.id ? "" : " uklj") + '" data-tekst="">+ Novi tekst</button>' + lista.map(function (x) {
          return '<button class="cip' + (x.id === t.id ? " uklj" : "") + '" data-tekst="' + esc(x.id) + '">' + esc(x.naslov || "Bez naslova") +
            ' <span class="tiho">· ' + (x.vidljivost === "blog" ? "Blog" : "Kutak") + (x.objavljeno ? "" : " · nacrt") + "</span></button>";
        }).join("") + "</div>" +
        '<section class="ured-blok forma-ured"><div class="nadnaslov">' + (t.id ? "Uredi tekst" : "Novi tekst") + "</div>" +
        polje("t-naslov", "Naslov", t.naslov) + polje("t-sazetak", "Kratak opis (vidi se u listi)", t.sazetak, "dugo") +
        izbor("t-gde", "Gde se objavljuje", [["kutak", "Kutak za čitanje · samo članovi"], ["blog", "Blog · javno, čita svako"]], t.vidljivost) +
        izbor("t-slika", "Slika (nije obavezno)", [["", "Bez slike"]].concat(SLIKE), t.slika || "") +
        polje("t-telo", "Tekst", t.telo, "dugo", "Prazan red = novi pasus. ## na početku reda = podnaslov. - na početku reda = stavka. **reč** = podebljano.") +
        polje("t-datum", "Datum", String(t.datum || "").slice(0, 10), "date") +
        '<label class="potvrda-red"><input type="checkbox" id="t-objavljeno"' + (t.objavljeno ? " checked" : "") + "> Objavljeno (bez kvačice tekst je nacrt i vidiš ga samo ti)</label>" +
        '<div style="display:flex;gap:12px;flex-wrap:wrap"><button class="dugme" id="t-sacuvaj">Sačuvaj tekst</button>' +
        (t.id ? '<a class="dugme obrub" href="#/' + (t.vidljivost === "blog" ? "blog" : "citanje") + "/" + esc(t.id) + '" target="_blank" rel="noopener">Pogledaj</a><button class="tihi-link" id="t-obrisi">Obriši tekst</button>' : "") + "</div></section>";
      var polj = document.getElementById("t-telo"); if (polj) polj.rows = 18;
      mesto.querySelectorAll("[data-tekst]").forEach(function (b) { b.addEventListener("click", function () { izabraniTekst = b.dataset.tekst || null; uredTekstovi(mesto); }); });
      document.getElementById("t-sacuvaj").addEventListener("click", function () {
        var n = { id: t.id, naslov: vr("t-naslov"), sazetak: vr("t-sazetak"), telo: document.getElementById("t-telo").value, slika: vr("t-slika"), vidljivost: vr("t-gde"),
          objavljeno: document.getElementById("t-objavljeno").checked, datum: vr("t-datum") ? new Date(vr("t-datum") + "T12:00:00").toISOString() : new Date().toISOString() };
        if (!n.naslov) return javi("Upiši naslov.", true);
        baza.sacuvajTekst(n).then(function (s) { izabraniTekst = s.id; javi(n.objavljeno ? "Tekst je sačuvan i objavljen." : "Nacrt je sačuvan."); uredTekstovi(mesto); })
          .catch(function (e) { console.error(e); javi("Nije sačuvano: " + (e.message || e), true); });
      });
      var ob = document.getElementById("t-obrisi");
      if (ob) ob.addEventListener("click", function () {
        if (ob.dataset.potvrda !== "1") { ob.dataset.potvrda = "1"; ob.textContent = "Klikni još jednom da obrišeš"; return; }
        baza.obrisiTekst(t.id).then(function () { izabraniTekst = null; javi("Tekst je obrisan."); uredTekstovi(mesto); })
          .catch(function (e) { console.error(e); javi("Nije obrisano.", true); });
      });
    }).catch(function (e) { console.error(e); mesto.innerHTML = '<p class="tekst">Tekstovi nisu učitani. Da li je pokrenut tekstovi.sql u Supabase-u?</p>'; });
  }

  var VEZANO_ZA_KUPOVINU = ["relaksacija-novac"];
  function uredBiblioteka(mesto, radna) {
    var kopija = radna || JSON.parse(JSON.stringify(S));
    kopija.biblioteka = kopija.biblioteka || [];
    var opcijeP = PROGRAMI_SVI().map(function (x) { return [x.id, x.naziv]; });
    mesto.innerHTML = '<p class="tiho" style="margin-bottom:24px">Relaksacije i snimci u Biblioteci. Snimak vidi samo onaj ko ima izabrani program ili ga je kupio. Fajl do 50 MB (mp3, m4a ili PDF).</p>' +
      '<section class="ured-blok">' + kopija.biblioteka.map(function (b, i) {
        var vezano = VEZANO_ZA_KUPOVINU.indexOf(b.id) >= 0 || b.program === b.id;
        return '<details class="modul-ured"' + (kopija.biblioteka.length === 1 ? " open" : "") + '><summary>' + esc(b.naziv) + ' <span class="tiho">· ' + esc(nazivPrograma(b.program)) + (b.vimeo ? "" : " · bez snimka") + "</span></summary>" +
          '<div class="forma-ured">' + polje("b" + i + "-naziv", "Naziv", b.naziv) + polje("b" + i + "-opis", "Kratak opis", b.opis, "text", "Npr. Vođena fantazija · 18 min") +
          (vezano ? '<p class="tiho">Ovaj snimak dobija ko kupi ' + esc(nazivPrograma(b.program)) + '.</p>'
            : izbor("b" + i + "-program", "Ko ga vidi", opcijeP, b.program)) +
          poljeFajl("b" + i + "-snimak", "Snimak", b.vimeo, b.program, "audio/*,video/mp4", "Otpremi mp3 ili m4a, ili nalepi YouTube, Vimeo ili Drive link.") +
          poljeFajl("b" + i + "-pdf", "PDF uputstvo (nije obavezno)", b.pdf, b.program, "application/pdf", "") +
          izbor("b" + i + "-slika", "Slika", SLIKE, b.slika) +
          (vezano ? "" : '<button class="tihi-link ukloni" data-i="' + i + '">Ukloni ovaj snimak</button>') + "</div></details>";
      }).join("") + '<button class="dugme obrub" id="nova-stavka" style="margin-top:20px">Dodaj snimak</button></section>' +
      '<div class="ured-sacuvaj"><button class="dugme" id="sacuvaj-bib">Sačuvaj biblioteku</button></div>';
    povezOtpremanje(mesto);
    kopija.biblioteka.forEach(function (b, i) {
      var sel = document.getElementById("b" + i + "-program");
      if (sel) sel.addEventListener("change", function () {
        mesto.querySelectorAll('input[data-za="b' + i + '-snimak"], input[data-za="b' + i + '-pdf"]').forEach(function (x) { x.dataset.folder = sel.value; });
      });
    });
    function procitaj() {
      kopija.biblioteka.forEach(function (b, i) {
        b.naziv = vr("b" + i + "-naziv") || b.naziv; b.opis = vr("b" + i + "-opis");
        if (document.getElementById("b" + i + "-program")) b.program = vr("b" + i + "-program");
        b.vimeo = vr("b" + i + "-snimak"); b.pdf = vr("b" + i + "-pdf"); b.slika = vr("b" + i + "-slika") || b.slika;
      });
    }
    document.getElementById("nova-stavka").addEventListener("click", function () {
      procitaj();
      kopija.biblioteka.push({ id: "snimak-" + Date.now(), program: "koren", naziv: "Novi snimak", opis: "", vimeo: "", pdf: "", slika: "slike/relaksacija.jpg" });
      uredBiblioteka(mesto, kopija); javi("Snimak je dodat. Popuni ga i klikni Sačuvaj biblioteku.");
    });
    mesto.querySelectorAll(".ukloni").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.potvrda !== "1") { b.dataset.potvrda = "1"; b.textContent = "Klikni još jednom da ukloniš snimak"; return; }
        procitaj(); kopija.biblioteka.splice(+b.dataset.i, 1);
        uredBiblioteka(mesto, kopija); javi("Snimak je uklonjen. Klikni Sačuvaj biblioteku da ostane tako.");
      });
    });
    document.getElementById("sacuvaj-bib").addEventListener("click", function () {
      procitaj();
      var los = kopija.biblioteka.filter(function (b) {
        return [b.vimeo, b.pdf].some(function (v) { return jeFajl(v) && putanja(v).split("/")[0] !== b.program; });
      })[0];
      if (los) return javi("Fajl za „" + los.naziv + "” je otpremljen za drugi program. Otpremi ga ponovo, pa sačuvaj.", true);
      baza.sacuvajSadrzaj(kopija).then(function () { S = kopija; window.SOBA_SADRZAJ = S; javi("Biblioteka je sačuvana. Polaznici odmah vide promene."); uredBiblioteka(mesto); })
        .catch(function (e) { console.error(e); javi("Nije sačuvano. Proveri internet i probaj ponovo.", true); });
    });
  }

  var izabranaPonuda = "koren";
  function uredPonuda(mesto) {
    var o = ponudaZa(izabranaPonuda) || ponudaZa("koren");
    var jeProg = !!program(o.id) && !clanstvo(program(o.id));
    mesto.innerHTML = '<div class="cipovi" style="margin-bottom:24px">' + redosledPonude().map(function (id) {
        var x = ponudaZa(id); if (!x) return "";
        return '<button class="cip' + (id === o.id ? " uklj" : "") + '" data-ponuda="' + esc(id) + '">' + esc(x.naziv) + (x.skrivena ? " (skriveno)" : "") + "</button>"; }).join("") +
      '<button class="cip" id="nova-ponuda">+ Nova ponuda</button></div>' +
      '<section class="ured-blok forma-ured" id="nova-forma" hidden><div class="nadnaslov">Nova ponuda</div>' +
      polje("np-naziv", "Naziv", "", "text", "Npr. Vođena fantazija: Granice") +
      izbor("np-vrsta", "Šta prodaješ", [["snimak", "Snimak (vođena fantazija, relaksacija) · stiže u Biblioteku"], ["program", "Program sa modulima · 3 godine pristupa i 6 meseci Kutka na poklon"]], "snimak") +
      izbor("np-slika", "Slika", SLIKE, "slike/relaksacija.jpg") +
      '<button class="dugme" id="np-napravi">Napravi ponudu</button></section>' +
      '<section class="ured-blok forma-ured"><div class="nadnaslov">Prodajna stranica: ' + esc(o.naziv) + "</div>" +
      '<p class="tiho">Ovo vidi svako, i ko nije kupio. <a href="#/ponuda/' + esc(o.id) + '" target="_blank" rel="noopener">Pogledaj stranicu</a></p>' +
      '<div class="polaris-kod"><strong>Kod ponude: ' + esc(o.id) + '</strong><br>U Polar-u, kod proizvoda, u Metadata dodaj <b>program</b> = <b>' + esc(o.id) + '</b>.' +
      (jeProg ? ' Za plaćanje na rate dodaj i <b>rate</b> = broj rata (npr. 4).' : "") + " Bez toga kupac ne dobija pristup.</div>" +
      polje("po-naziv", "Naziv na stranici", o.naziv) +
      izbor("po-slika", "Slika", SLIKE, o.slika) +
      '<label class="potvrda-red"><input type="checkbox" id="po-skrivena"' + (o.skrivena ? " checked" : "") + "> Sakrij sa stranice Pridruži se (stranica i dalje radi preko direktnog linka)</label>" +
      polje("po-kupi", "Link za kupovinu u celosti (Polar checkout link)", o.kupi, "url", "Polar → Products → Checkout Links. Dok su oba linka prazna, na dugmetu piše „Uskoro”.") +
      polje("po-cena", "Cena u celosti", o.cena, "text", "Npr. 229 € ili 19 € mesečno") +
      polje("po-kupirate", "Link za kupovinu na rate (nije obavezno)", o.kupiRate, "url") +
      polje("po-cenarate", "Cena na rate (nije obavezno)", o.cenaRate, "text", "Npr. 4 × 60 €") +
      polje("po-nacin", "Kako se plaća", o.nacin, "text") +
      polje("po-podnaslov", "Podnaslov", o.podnaslov) +
      polje("po-zakoga", "Za koga je", o.zaKoga, "dugo") +
      polje("po-opis", "Kako izgleda", o.opis, "dugo") +
      polje("po-dobijas", "Šta dobijaš (svaki red jedna stavka)", o.dobijas, "dugo") +
      '<button class="dugme" id="po-sacuvaj">Sačuvaj stranicu</button></section>';
    mesto.querySelectorAll("[data-ponuda]").forEach(function (b) {
      b.addEventListener("click", function () { izabranaPonuda = b.dataset.ponuda; uredPonuda(mesto); });
    });
    document.getElementById("nova-ponuda").addEventListener("click", function () { document.getElementById("nova-forma").hidden = false; document.getElementById("np-naziv").focus(); });
    document.getElementById("np-napravi").addEventListener("click", function () {
      var naziv = vr("np-naziv"), vrsta = vr("np-vrsta"), slika = vr("np-slika");
      if (!naziv) return javi("Upiši naziv nove ponude.", true);
      var kod = naziv.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "dj").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "ponuda";
      var zauzeto = function (k) { return redosledPonude().indexOf(k) >= 0 || !!program(k) || S.biblioteka.some(function (b) { return b.id === k; }); };
      var baza0 = kod, n = 2; while (zauzeto(kod)) kod = baza0 + "-" + n++;
      var kopija = JSON.parse(JSON.stringify(S));
      if (vrsta === "program") kopija.programi.push({ id: kod, mesecno: true, naziv: naziv, kratko: "", slika: slika, naslovnaTekst: false, citat: "", uzProgram: [],
        moduli: [{ id: "01", rim: "I", naziv: "Prvi modul", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" }] });
      else kopija.biblioteka.push({ id: kod, program: kod, naziv: naziv, opis: "Vođena fantazija", vimeo: "", pdf: "", slika: slika });
      var sve = JSON.parse(JSON.stringify(PODESAVANJA.ponuda || {}));
      sve[kod] = { vrsta: vrsta, naziv: naziv, slika: slika, skrivena: true, kupi: "", kupiRate: "", cena: "", cenaRate: "",
        nacin: vrsta === "program" ? "Plaćaš odjednom ili na rate." : "Jednokratno. Slušaš kad god ti treba.", podnaslov: "", zaKoga: "", opis: "", dobijas: "" };
      var red = redosledPonude(); red.push(kod);
      baza.sacuvajSadrzaj(kopija)
        .then(function () { S = kopija; window.SOBA_SADRZAJ = S; return baza.sacuvajPodesavanje("ponuda", sve); })
        .then(function () { PODESAVANJA.ponuda = sve; return baza.sacuvajPodesavanje("redosledPonude", red); })
        .then(function () {
          PODESAVANJA.redosledPonude = red; izabranaPonuda = kod; uredPonuda(mesto);
          javi("Ponuda je napravljena i za sada je skrivena. Popuni stranicu, " + (vrsta === "program" ? "dodaj module u Sadržaju" : "otpremi snimak u Biblioteci") + ", nalepi Polar linkove i skini kvačicu Sakrij.");
        }).catch(function (e) { console.error(e); javi("Nije napravljeno. Proveri internet i probaj ponovo.", true); });
    });
    document.getElementById("po-sacuvaj").addEventListener("click", function () {
      var sve = JSON.parse(JSON.stringify(PODESAVANJA.ponuda || {}));
      var ranije = sve[o.id] || {};
      sve[o.id] = { vrsta: ranije.vrsta, naziv: vr("po-naziv"), slika: vr("po-slika"), skrivena: document.getElementById("po-skrivena").checked, kupi: vr("po-kupi"), cena: vr("po-cena"), kupiRate: vr("po-kupirate"), cenaRate: vr("po-cenarate"), nacin: vr("po-nacin"), podnaslov: vr("po-podnaslov"), zaKoga: vr("po-zakoga"), opis: vr("po-opis"), dobijas: document.getElementById("po-dobijas").value.trim() };
      if ([sve[o.id].kupi, sve[o.id].kupiRate].some(function (l) { return l && !/^https:\/\//.test(l); })) return javi("Link za kupovinu mora da počinje sa https://", true);
      baza.sacuvajPodesavanje("ponuda", sve).then(function () { PODESAVANJA.ponuda = sve; javi("Stranica je sačuvana."); })
        .catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
    });
  }

  function uredNaslovna(mesto) {
    var n = PODESAVANJA.naslovna || {};
    mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Početna Prostora</div>' +
      polje("n-recenica", "Rečenica ispod pozdrava", n.recenica || "Ne moraš danas sve. Dovoljan je jedan deo.") +
      polje("n-poruka", "Poruka meseca", n.poruka || "", "dugo", "Vide je svi polaznici ispod pozdrava. Ostavi prazno kad ne treba.") +
      izbor("n-slika", "Fotografija na ulazu", SLIKE, n.slikaUlaz || "slike/cvetovi.jpg") +
      '<button class="dugme" id="sacuvaj-naslovnu">Sačuvaj naslovnu</button></section>' +
      '';
    document.getElementById("sacuvaj-naslovnu").addEventListener("click", function () {
      var v = { recenica: vr("n-recenica"), poruka: vr("n-poruka"), slikaUlaz: vr("n-slika") };
      baza.sacuvajPodesavanje("naslovna", v).then(function () { PODESAVANJA.naslovna = v; javi("Naslovna je sačuvana."); })
        .catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
    });
  }

  function uredPromocija(mesto) {
    return baza.promocije().then(function (lista) {
      var d = danas();
      var ciljne = [["svi", "Svi polaznici"]].concat(PROGRAMI_SVI().map(function (p) { return [p.id, "Samo oni koji nemaju: " + p.naziv]; }));
      var sutra14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
      mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Nova promocija</div>' +
        polje("pr-naslov", "Naslov", "") + polje("pr-tekst", "Tekst", "", "dugo") +
        polje("pr-dugme", "Tekst na dugmetu", "Pogledaj") + polje("pr-link", "Link", "https://upoznajsebe.com/", "url", "Gde vodi dugme, npr. stranica programa ili plaćanje") +
        izbor("pr-slika", "Fotografija", SLIKE, "slike/more.jpg") +
        '<div class="dva-polja">' + polje("pr-od", "Od", d, "date") + polje("pr-do", "Do", sutra14, "date") + "</div>" +
        izbor("pr-ciljna", "Ko je vidi", ciljne, "svi") +
        '<button class="dugme" id="sacuvaj-promociju">Objavi promociju</button></section>' +
        '<section class="ured-blok"><div class="nadnaslov">Promocije</div>' + (lista.length ? lista.map(function (x) {
          var stanje = !x.aktivna ? "Ugašena" : x["do"] < d ? "Istekla" : x.od > d ? "Počinje " + lepDatum(x.od) : "Traje do " + lepDatum(x["do"]);
          return '<div class="ured-red kolona-red"><strong>' + esc(x.naslov) + '</strong><span class="tiho">' + stanje + " · " + esc((ciljne.filter(function (c) { return c[0] === x.ciljna; })[0] || ["", x.ciljna])[1]) + "</span>" +
            '<div class="cipovi">' + (x.aktivna ? '<button class="cip" data-ugasi="' + esc(x.id) + '">Ugasi</button>' : '<button class="cip" data-upali="' + esc(x.id) + '">Uključi ponovo</button>') +
            '<button class="cip" data-obrisi="' + esc(x.id) + '">Obriši</button></div></div>';
        }).join("") : '<p class="tekst">Još nema promocija.</p>') + "</section>";
      document.getElementById("sacuvaj-promociju").addEventListener("click", function () {
        var p = { naslov: vr("pr-naslov"), tekst: vr("pr-tekst"), dugme: vr("pr-dugme") || "Pogledaj", link: vr("pr-link"), slika: vr("pr-slika"), od: vr("pr-od"), "do": vr("pr-do"), ciljna: vr("pr-ciljna"), aktivna: true };
        if (!p.naslov) return javi("Upiši naslov promocije.", true);
        if (p["do"] < p.od) return javi("Datum završetka je pre početka.", true);
        baza.sacuvajPromociju(p).then(function () { javi("Promocija je objavljena."); uredPromocija(mesto); }).catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
      });
      function nadji(id) { return lista.filter(function (x) { return String(x.id) === id; })[0]; }
      mesto.querySelectorAll("[data-ugasi],[data-upali]").forEach(function (b) {
        b.addEventListener("click", function () {
          var x = nadji(b.dataset.ugasi || b.dataset.upali); x.aktivna = !!b.dataset.upali;
          baza.sacuvajPromociju(x).then(function () { javi(x.aktivna ? "Promocija je uključena." : "Promocija je ugašena."); uredPromocija(mesto); });
        });
      });
      mesto.querySelectorAll("[data-obrisi]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (b.dataset.potvrda !== "1") { b.dataset.potvrda = "1"; b.textContent = "Sigurno obriši"; return; }
          baza.obrisiPromociju(b.dataset.obrisi).then(function () { javi("Promocija je obrisana."); uredPromocija(mesto); });
        });
      });
    });
  }

  function kuponiPoziv(telo) {
    if (DEMO) {
      var k = citaj("soba_kuponi", [{ id: "d1", naziv: "Proba", kod: "PROBA", procenat: 100, trajanje: "once", istice: null, max: 1, iskorisceno: 1, programi: ["relaksacija-novac"] }]);
      if (telo.akcija === "napravi") { k.unshift({ id: "d" + Date.now(), naziv: telo.naziv || telo.kod, kod: telo.kod.toUpperCase(), procenat: +telo.procenat, trajanje: telo.trajanje, meseci: telo.meseci, istice: telo.istice || null, max: telo.max || null, iskorisceno: 0, programi: telo.programi }); pisi("soba_kuponi", k); }
      if (telo.akcija === "obrisi") { pisi("soba_kuponi", k.filter(function (x) { return x.id !== telo.id; })); }
      return Promise.resolve({ kuponi: citaj("soba_kuponi", k), ok: true });
    }
    return sb.functions.invoke("polar-kuponi", { body: telo }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json() : Promise.reject(r.error)).then(function (j) { throw new Error((j && j.greska) || "Greška"); });
      }
      if (r.data && r.data.greska) throw new Error(r.data.greska);
      return r.data;
    });
  }
  function opisTrajanja(k) {
    if (k.trajanje === "forever") return "na svaku uplatu";
    if (k.trajanje === "repeating") return (k.meseci || "?") + " mes.";
    return "jednom";
  }
  function uredKuponi(mesto) {
    mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Novi kupon</div>' +
      polje("k-kod", "Kod koji kupac upisuje", "", "text", "Samo slova i brojevi, bez razmaka. Npr. DECEMBAR20") +
      polje("k-naziv", "Naziv za tebe (kupac ga ne vidi)", "", "text", "Npr. Decembarska akcija za Koren") +
      polje("k-procenat", "Popust u %", "20", "number") +
      izbor("k-trajanje", "Za pretplate (Povratak sebi, Kutak) popust važi", [["once", "samo prvu uplatu"], ["repeating", "nekoliko meseci"], ["forever", "na svaku uplatu"]], "once") +
      polje("k-meseci", "Koliko meseci (samo ako si izabrala nekoliko meseci)", "2", "number") +
      '<fieldset class="polje-ured"><legend>Za koje programe</legend>' + PROGRAMI_SVI().map(function (p) {
        return '<label class="cek"><input type="checkbox" name="k-prog" value="' + esc(p.id) + '"> ' + esc(p.naziv) + "</label>"; }).join("") +
      '<span class="tiho">Ništa štiklirano = važi za sve programe.</span></fieldset>' +
      polje("k-istice", "Važi do (nije obavezno)", "", "date") +
      polje("k-max", "Najviše korišćenja (nije obavezno)", "", "number", "Npr. 10 za prvih deset kupaca") +
      '<button class="dugme" id="k-napravi">Napravi kupon</button></section>' +
      '<section class="ured-blok"><div class="nadnaslov">Tvoji kuponi</div><div id="k-lista"><p class="tiho">Učitavam iz Polar-a…</p></div></section>';
    function lista() {
      kuponiPoziv({ akcija: "lista" }).then(function (r) {
        var k = r.kuponi || [];
        document.getElementById("k-lista").innerHTML = k.length ? k.map(function (x) {
          var istekao = x.istice && new Date(x.istice) < new Date();
          var potrosen = x.max && x.iskorisceno >= x.max;
          return '<div class="ured-red kolona-red"><div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap">' +
            '<strong style="letter-spacing:.12em;color:var(--pl)">' + esc(x.kod || "(bez koda)") + "</strong>" +
            '<span class="tiho">' + (istekao ? "istekao" : potrosen ? "potrošen" : "aktivan") + "</span></div>" +
            '<span class="tekst" style="font-size:14px">' + esc(x.naziv || "") + " · " + (x.procenat != null ? x.procenat + "%" : (x.iznos / 100) + " " + (x.valuta || "")) + " · " + opisTrajanja(x) +
            " · iskorišćen " + (x.iskorisceno || 0) + (x.max ? "/" + x.max : "") + "×" + (x.istice ? " · do " + lepDatum(String(x.istice).slice(0, 10)).toLowerCase() : "") +
            (x.programi && x.programi.length ? " · " + x.programi.map(nazivPrograma).join(", ") : " · svi programi") + "</span>" +
            '<button class="malo-dugme" data-obrisi-kupon="' + esc(x.id) + '" style="align-self:flex-start">Obriši</button></div>';
        }).join("") : '<p class="tekst">Još nema kupona.</p>';
        document.querySelectorAll("[data-obrisi-kupon]").forEach(function (b) {
          b.addEventListener("click", function () {
            if (b.dataset.potvrda !== "1") { b.dataset.potvrda = "1"; b.textContent = "Sigurno? Klikni još jednom"; return; }
            kuponiPoziv({ akcija: "obrisi", id: b.dataset.obrisiKupon }).then(function () { javi("Kupon je obrisan."); lista(); })
              .catch(function (e) { javi(e.message || "Nije obrisano.", true); });
          });
        });
      }).catch(function (e) {
        document.getElementById("k-lista").innerHTML = '<p class="tekst">' + esc(e.message || "Polar trenutno ne odgovara.") + "</p>";
      });
    }
    document.getElementById("k-napravi").addEventListener("click", function () {
      var b = this;
      var telo = { akcija: "napravi", kod: vr("k-kod"), naziv: vr("k-naziv"), procenat: vr("k-procenat"), trajanje: vr("k-trajanje"), meseci: vr("k-meseci"),
        programi: Array.prototype.map.call(document.querySelectorAll('input[name="k-prog"]:checked'), function (c) { return c.value; }),
        istice: vr("k-istice"), max: vr("k-max") };
      if (!/^[A-Za-z0-9]{3,}$/.test(telo.kod)) return javi("Kod: bar 3 slova ili broja, bez razmaka.", true);
      if (!(+telo.procenat >= 1 && +telo.procenat <= 100)) return javi("Popust mora biti između 1 i 100%.", true);
      b.disabled = true;
      kuponiPoziv(telo).then(function () { javi("Kupon " + telo.kod.toUpperCase() + " je napravljen."); document.getElementById("k-kod").value = ""; lista(); })
        .catch(function (e) { javi(e.message || "Kupon nije napravljen.", true); })
        .then(function () { b.disabled = false; });
    });
    lista();
  }

  /* ---------- usmeravanje ---------- */
  function prikazi() {
    var put = location.hash.replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
    if (put[0] === "blog") {
      window.scrollTo(0, 0);
      if (korisnik && !SADRZAJ_UCITAN) return pripremi().then(prikazi);
      return ekranBlog(put[1]);
    }
    if (put[0] === "ponuda" || put[0] === "hvala") {
      window.scrollTo(0, 0);
      if (put[0] === "hvala") return ekranHvala();
      var nastavi = function (pristup) {
        var o = put[1] && ponudaZa(put[1]);
        return o ? ekranPonudaJedna(o, pristup) : ekranPonuda(pristup);
      };
      if (!korisnik) return nastavi([]);
      if (!SADRZAJ_UCITAN) return pripremi().then(prikazi);
      return baza.pristup().then(function (r) { nastavi(prosiri(r)); }).catch(function () { nastavi([]); });
    }
    if (!korisnik) { SADRZAJ_UCITAN = false; JE_UREDNIK = false; return ekranUlaz(); }
    if (!SADRZAJ_UCITAN) return pripremi().then(prikazi);
    // Upitnik: dok se proverava ili dok je na ekranu, ništa drugo ne sme da ga prekrije
    // (posle ulaska preko linka Supabase pozove prikazi više puta zaredom).
    if (UPITNIK_STANJE === "provera" || UPITNIK_STANJE === "prikazan") return;
    if (UPITNIK_STANJE === null) {
      UPITNIK_STANJE = "provera";
      return trebaUpitnik().then(function (treba) {
        if (!treba) { UPITNIK_STANJE = "gotovo"; return prikazi(); }
        UPITNIK_STANJE = "prikazan";
        ekranUpitnik(function () { UPITNIK_STANJE = "gotovo"; prikazi(); });
      });
    }
    var delovi = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (delovi[0] === "uredjivanje") return JE_UREDNIK ? ekranUredjivanje(delovi[1] || "pregled") : (location.hash = "#/");
    if (delovi[0] === "dnevnik") return baza.dnevnik().then(function (s) { ekranDnevnik(s, delovi[1]); }).catch(greska);
    Promise.all([baza.pristup(), baza.napredak()]).then(function (r) {
      var pristup = prosiri(r[0]), napredak = r[1];
      if (delovi[0] === "program") { var p = program(delovi[1]); return p ? ekranProgram(p, pristup, napredak) : ekranSoba(pristup, napredak); }
      if (delovi[0] === "modul") {
        var pp = program(delovi[1]); var m = pp && pp.moduli.filter(function (x) { return x.id === delovi[2]; })[0];
        return m ? ekranModul(pp, m, pristup, napredak) : ekranSoba(pristup, napredak);
      }
      if (delovi[0] === "biblioteka") return ekranBiblioteka(pristup, delovi[1]);
      if (delovi[0] === "citanje") return ekranCitanje(pristup, delovi[1]);
      ekranSoba(pristup, napredak);
    }).catch(greska);
  }

  function pripremi() {
    return baza.podesavanja().then(function (p) { PODESAVANJA = p || {}; }).catch(function () {})
      .then(function () {
        if (!korisnik || SADRZAJ_UCITAN) return;
        return Promise.all([baza.jeUrednik(), baza.ucitajSadrzaj()]).then(function (r) {
          JE_UREDNIK = r[0]; if (r[1] && r[1].programi) { S = dopuni(r[1]); window.SOBA_SADRZAJ = S; }
          SADRZAJ_UCITAN = true;
        }).catch(function (e) { console.error(e); SADRZAJ_UCITAN = true; });
      });
  }

  window.addEventListener("hashchange", prikazi);
  baza.init().then(pripremi).then(prikazi).catch(greska);
})();
