/* Soba · Upoznaj Sebe
   Jedna stranica, bez build koraka. Radi na GitHub Pages.
   Bez Supabase podešavanja radi u DEMO režimu (sve se čuva u ovom pregledaču). */
(function () {
  "use strict";
  var C = window.SOBA_CONFIG || {};
  var S = window.SOBA_SADRZAJ || { programi: [], biblioteka: [] };
  var DEMO = !(C.SUPABASE_URL && C.SUPABASE_KLJUC);
  var app = document.getElementById("app");
  var sb = null;
  var korisnik = null;
  var JE_UREDNIK = false;
  var PODESAVANJA = {};
  var SADRZAJ_UCITAN = false;
  var PROGRAMI_SVI = function () { return S.programi.map(function (p) { return { id: p.id, naziv: p.naziv }; }).concat([{ id: "relaksacija-novac", naziv: "Relaksacija za rad sa novcem" }]); };

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
      if (DEMO) return Promise.resolve(["koren", "povratak", "relaksacija-novac"]);
      return sb.from("pristup").select("program").eq("aktivan", true)
        .then(function (r) { if (r.error) throw r.error; return r.data.map(function (x) { return x.program; }); });
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
      return sb.from("pristup").select("email,program,aktivan,izvor,istice,azurirano").order("azurirano", { ascending: false })
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    dodajPristup: function (email, programi) {
      email = email.toLowerCase().trim();
      if (DEMO) {
        var sve = citaj("soba_pristupi", []);
        programi.forEach(function (pr) {
          var i = sve.findIndex(function (x) { return x.email === email && x.program === pr; });
          if (i >= 0) sve[i].aktivan = true; else sve.unshift({ email: email, program: pr, aktivan: true, izvor: "rucno" });
        });
        pisi("soba_pristupi", sve); return Promise.resolve();
      }
      var redovi = programi.map(function (pr) { return { email: email, program: pr, aktivan: true, izvor: "rucno", azurirano: new Date().toISOString() }; });
      return sb.from("pristup").upsert(redovi, { onConflict: "email,program" }).then(function (r) { if (r.error) throw r.error; });
    },
    promeniPristup: function (email, program, aktivan) {
      if (DEMO) {
        var sve = citaj("soba_pristupi", []); sve.forEach(function (x) { if (x.email === email && x.program === program) x.aktivan = aktivan; });
        pisi("soba_pristupi", sve); return Promise.resolve();
      }
      return sb.from("pristup").update({ aktivan: aktivan, azurirano: new Date().toISOString() }).eq("email", email).eq("program", program)
        .then(function (r) { if (r.error) throw r.error; });
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
    var stavke = [["#/", "soba", "Soba"], ["#/dnevnik", "dnevnik", "Moj dnevnik"], ["#/biblioteka", "bib", "Biblioteka"]];
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
      '<div class="dno"><span class="ozn">Tvoja soba</span><h1>Upoznaj<em>sebe.</em></h1></div></div>' +
      '<form id="forma" class="okvir ulaz-forma" novalidate>' +
      (poruka ? '<div class="poruka" role="status">' + poruka + "</div>" :
        '<p class="tekst" style="text-align:center">Upiši mejl sa kojim si kupio program. Poslaćemo ti link za ulaz, lozinka ti ne treba.</p>') +
      '<div style="display:flex;flex-direction:column;gap:8px"><label class="oznaka" for="mejl">Tvoj mejl</label>' +
      '<input class="polje" id="mejl" type="email" autocomplete="email" inputmode="email" placeholder="ime@mejl.com" required></div>' +
      '<button class="dugme" type="submit">Pošalji mi link</button>' +
      '<p class="tiho" style="text-align:center">Link važi sat vremena. Ako ne stigne za par minuta, pogledaj i u Promocije ili Spam.</p></form></main>';
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
      if (r.gotovo && i < p.moduli.length - 1) return { p: p, m: p.moduli[i + 1], poz: 0 };
      return { p: p, m: p.moduli[i], poz: r.pozicija || 0 };
    }
    var prvi = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0; })[0];
    return prvi ? { p: prvi, m: prvi.moduli[0], poz: 0, novo: true } : null;
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
        "<h2>Modul " + esc(dalje.m.rim) + " · <em>" + esc(dalje.m.naziv) + "</em></h2>" + gotovoDeo +
        '<a class="dugme" style="margin-top:8px" href="#/modul/' + dalje.p.id + "/" + dalje.m.id + '">' + (dalje.novo ? "Počni" : "Nastavi") + "</a></div></section>";
    }
    h += '<div class="soba-desno">';
    if (moji.length) {
      h += '<section class="okvir prostorije" aria-label="Tvoje prostorije"><div class="nadnaslov">Tvoje prostorije</div>' +
        moji.map(function (p) {
          var g = p.moduli.filter(function (m) { var x = napredak[p.id + "/" + m.id]; return x && x.gotovo; }).length;
          return '<a class="prostorija" href="#/program/' + p.id + '"><img src="' + p.slika + '" alt=""><span style="flex:1;display:flex;flex-direction:column;gap:4px"><span class="ime">' +
            esc(p.naziv) + '</span><span class="tiho">' + esc(p.kratko) + (g ? " · prošao si " + g : "") + "</span></span>" + STRELICA + "</a>";
        }).join("") + "</section>";
    } else {
      h += '<div class="okvir prostorije"><div class="poruka">Na ovom mejlu još nema otvorenih programa. Ako si kupio program sa drugim mejlom, odjavi se i uđi sa njim. Ako ne uspeš, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</div></div>";
    }
    var predlozi = ostali.map(function (p) { return { naziv: p.naziv, slika: p.slika }; })
      .concat(nemaBib.map(function (b) { return { naziv: b.naziv, slika: b.slika }; }));
    if (predlozi.length) {
      var pr = predlozi[0];
      h += '<a class="predlog" href="https://upoznajsebe.com/" target="_blank" rel="noopener">' +
        '<img src="' + pr.slika + '" alt="" style="width:56px;height:56px;object-fit:cover;flex:none"><span><span class="nadnaslov" style="font-size:10px">Još iz Upoznaj Sebe</span>' +
        '<span style="display:block;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--ink)">' + esc(pr.naziv) + "</span></span></a>";
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
      '<a href="#/" class="malo-dugme" style="position:absolute;top:16px;left:16px;background:rgba(250,248,244,.92);color:var(--pl);padding:0 16px">← Soba</a></div>';
    var citat = "";
    if (p.citat) citat = '<div class="okvir citat">' +
      '<p style="font-family:var(--serif);font-style:italic;font-weight:300;font-size:25px;line-height:1.4;color:var(--ink)">„' + esc(p.citat) + '”</p><span class="tiho" style="letter-spacing:.24em;text-transform:uppercase;font-size:10.5px">Milica Bilbija</span></div>';
    else citat = '<div class="okvir citat"><h1>' + esc(p.naziv) + "</h1></div>";
    h += '<div class="dve-kolone"><div class="glavno">' + citat + '<section class="okvir blok" aria-label="Moduli"><div class="nadnaslov">Moduli</div><div style="padding-top:8px">' +
      p.moduli.map(function (m) {
        var st = statusModula(p, m, napredak, tren);
        return '<a class="red ' + st[0] + '" href="#/modul/' + p.id + "/" + m.id + '"><span class="broj">' + esc(m.rim) + '</span><span style="flex:1"><span class="naziv">' + esc(m.naziv) + "</span>" +
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

  function ekranZatvoreno(p) {
    app.innerHTML = '<main class="ekran">' + zaglavlje() + '<div class="okvir" style="padding-top:44px;display:flex;flex-direction:column;gap:18px">' +
      '<div class="nadnaslov">' + esc(p ? p.naziv : "Program") + "</div><h1>Ova prostorija <em>još nije tvoja.</em></h1>" +
      '<p class="tekst">Program nije otvoren na mejlu sa kojim si ušao. Ako si ga kupio sa drugim mejlom, odjavi se i uđi sa njim.</p>' +
      '<a class="dugme obrub" href="https://upoznajsebe.com/" target="_blank" rel="noopener">Pogledaj program</a></div></main>' + meni("soba");
  }

  var pauzaPrikazana = {};
  function ekranModul(p, m, pristup, napredak) {
    if (pristup.indexOf(p.id) < 0) return ekranZatvoreno(p);
    var kljuc = p.id + "/" + m.id;
    if (!pauzaPrikazana[kljuc]) {
      app.innerHTML = '<main class="pauza"><div class="krug-okvir" aria-hidden="true"><div class="krug"></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:14px;align-items:center"><div class="nadnaslov">Modul ' + esc(m.rim) + "</div>" +
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
      '<div style="display:flex;flex-direction:column;gap:12px"><div class="nadnaslov">Modul ' + esc(m.rim) + "</div><h1>" + esc(m.naziv) + "</h1>" +
      (m.podnaslov ? '<p class="tekst">' + esc(m.podnaslov) + "</p>" : "") + "</div></div>" +
      '<div class="dve-kolone okvir"><div class="glavno kolona">';
    h += '<section style="display:flex;flex-direction:column;gap:10px" aria-label="Video"><div class="video">' +
      (m.vimeo ? '<iframe id="vimeo" src="https://player.vimeo.com/video/' + encodeURIComponent(m.vimeo) + '?dnt=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="' + esc(m.naziv) + '"></iframe>'
        : '<img src="' + p.slika + '" alt=""><div class="prazno">Video uskoro</div>') + "</div>" +
      '<span class="tiho" id="vreme">' + (x.gotovo ? "Odgledano" : x.pozicija ? "Nastavljaš od " + vreme(x.pozicija) : m.trajanje ? "Trajanje " + esc(m.trajanje) : "") + "</span></section>";
    if (m.pismo) h += '<section class="pismo" aria-label="Reč od Milice"><div class="glava"><img src="slike/milica.jpg" alt="Milica Bilbija"><span><span class="nadnaslov" style="font-size:10px">Pre videa</span>' +
      '<span style="display:block;font-family:var(--serif);font-size:19px;color:var(--ink)">Reč od Milice</span></span></div><p class="tekst">' + esc(m.pismo) + '</p><span class="potpis">Milica</span></section>';
    h += '</div><aside class="strana kolona">';
    var uz = "";
    if (sveska) uz += '<a class="red" href="' + esc(link(sveska.link)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:20px">' + esc(sveska.naziv) + '</span><span class="pod">PDF · strana modula ' + esc(m.id) + "</span></span>" + STRELICA + "</a>";
    if (mapa) uz += '<a class="red" href="' + esc(mapa) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:20px">Mapa pojmova</span><span class="pod">Kad naiđeš na reč koju ne razumeš</span></span>' + STRELICA + "</a>";
    if (m.zadatak) uz += '<div class="red" style="display:block"><span class="naziv" style="font-size:20px">Zadatak za ovu nedelju</span><span class="pod" style="font-size:14px;color:var(--tx);margin-top:6px">' + esc(m.zadatak) + "</span></div>";
    if (uz) h += '<section aria-label="Uz modul"><div class="nadnaslov">Uz modul</div>' + uz + "</section>";
    if (m.trebalo || m.recenica) h += '<section class="trebalo" aria-label="Šta ti je tada trebalo"><div class="nadnaslov">Šta ti je tada trebalo</div>' +
      (m.trebalo ? '<p class="tekst">' + esc(m.trebalo) + "</p>" : "") + (m.recenica ? '<p class="recenica">„' + esc(m.recenica) + '”</p>' : "") + "</section>";
    h += '<div style="display:flex;flex-direction:column;gap:6px">' +
      (x.gotovo ? (sledeci ? '<a class="dugme" href="#/modul/' + p.id + "/" + sledeci.id + '">Sledeći modul</a>' : "")
        : '<button class="dugme" id="gotovo">Odgledao sam ovaj modul</button>') +
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
    var stavke = S.biblioteka.filter(function (b) { return pristup.indexOf(b.program) >= 0; });
    var otvorena = stavke.filter(function (b) { return b.id === otvoriId; })[0];
    var h = '<main class="ekran biblioteka">' + demoTraka() + '<div class="bib-slika"><img src="' + (otvorena ? otvorena.slika : "slike/relaksacija.jpg") + '" alt=""></div>' +
      '<div class="okvir pozdrav"><div class="nadnaslov">Biblioteka</div>' +
      '<h1 style="font-size:42px">Za večeri kad ti <em>treba mir</em></h1><p class="tekst">Slušaj sa slušalicama, u tišini.</p></div>';
    if (otvorena) h += '<section class="okvir blok otvoreno" style="display:flex;flex-direction:column;gap:10px"><div class="video">' +
      (otvorena.vimeo ? '<iframe src="https://player.vimeo.com/video/' + encodeURIComponent(otvorena.vimeo) + '?dnt=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen" allowfullscreen title="' + esc(otvorena.naziv) + '"></iframe>'
        : '<img src="' + otvorena.slika + '" alt=""><div class="prazno">Snimak uskoro</div>') + '</div><span class="tiho">' + esc(otvorena.naziv) + "</span></section>";
    h += '<div class="dve-kolone"><section class="okvir blok glavno" aria-label="Relaksacije"><div class="nadnaslov">Relaksacije</div>' +
      (stavke.length ? stavke.map(function (b) {
        return '<a class="red" href="#/biblioteka/' + b.id + '"><span style="width:46px;height:46px;border-radius:50%;border:1px solid var(--pl);display:flex;align-items:center;justify-content:center;flex:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="#3D2440" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>' +
          '<span style="flex:1"><span class="naziv" style="font-size:22px">' + esc(b.naziv) + '</span><span class="pod">' + esc(b.opis) + "</span></span></a>";
      }).join("") : '<p class="tekst" style="padding-top:12px">Ovde će biti relaksacije iz tvojih programa.</p>') + "</section>";
    var mape = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0 && link(p.mapa); });
    h += '<aside class="strana">';
    if (mape.length) h += '<section class="okvir blok" aria-label="Za čitanje"><div class="nadnaslov">Za čitanje</div>' +
      mape.map(function (p) { return '<a class="red" href="' + esc(link(p.mapa)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:22px">Mapa pojmova</span><span class="pod">' + esc(p.naziv) + "</span></span>" + STRELICA + "</a>"; }).join("") + "</section>";
    h += "</aside></div></main>" + meni("bib");
    app.innerHTML = h;
  }

  /* ---------- Uređivanje (samo urednici) ---------- */
  var RIM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  var SLIKE = [["slike/cvetovi.jpg", "Cvetovi (Koren)"], ["slike/more.jpg", "More (Povratak sebi)"], ["slike/relaksacija.jpg", "Relaksacija"], ["slike/milica.jpg", "Milica"]];
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
  function javi(tekst, greska) { var el = document.getElementById("javi"); if (el) { el.textContent = tekst; el.className = "javi" + (greska ? " greska" : ""); } }

  function ekranUredjivanje(tab) {
    var tabovi = [["pregled", "Pregled"], ["polaznici", "Polaznici"], ["sadrzaj", "Sadržaj"], ["naslovna", "Naslovna"], ["promocija", "Promocija"], ["kuponi", "Kuponi"]];
    app.innerHTML = '<main class="ekran ured">' + demoTraka() + zaglavlje() +
      '<div class="okvir pozdrav"><div class="nadnaslov">Samo za tebe</div><h1>Ure<em>đivanje</em></h1></div>' +
      '<nav class="ured-tabovi okvir" aria-label="Delovi uređivanja">' + tabovi.map(function (t) {
        return '<a href="#/uredjivanje/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + ">" + t[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="okvir" id="ured-sadrzaj"><p class="tiho">Učitavam...</p></div><p id="javi" class="javi" role="status"></p></main>' + meni("ured");
    var mesto = document.getElementById("ured-sadrzaj");
    var f = { pregled: uredPregled, polaznici: uredPolaznici, sadrzaj: uredSadrzaj, naslovna: uredNaslovna, promocija: uredPromocija, kuponi: uredKuponi }[tab] || uredPregled;
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
        }).join("") : '<p class="tekst">Još nema polaznika.</p>') + "</section>";
    });
  }

  function uredPolaznici(mesto) {
    return baza.sviPristupi().then(function (sve) {
      var poMejlu = {}; sve.forEach(function (x) { (poMejlu[x.email] = poMejlu[x.email] || []).push(x); });
      mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Otvori pristup</div>' +
        polje("novi-mejl", "Mejl polaznika", "", "email", "Isti mejl kojim je platio. Polaznik ulazi preko linka na taj mejl.") +
        '<fieldset class="polje-ured"><legend>Programi</legend>' + PROGRAMI_SVI().map(function (p) {
          return '<label class="cek"><input type="checkbox" name="prog" value="' + esc(p.id) + '"> ' + esc(p.naziv) + "</label>"; }).join("") + "</fieldset>" +
        '<button class="dugme" id="dodaj">Otvori pristup</button></section>' +
        '<section class="ured-blok"><div class="nadnaslov">Polaznici i programi</div>' + (Object.keys(poMejlu).length ? Object.keys(poMejlu).map(function (m) {
          return '<div class="ured-red kolona-red"><strong>' + esc(m) + '</strong><div class="cipovi">' + poMejlu[m].map(function (x) {
            return '<button class="cip' + (x.aktivan ? " uklj" : "") + '" data-mejl="' + esc(x.email) + '" data-prog="' + esc(x.program) + '" data-akt="' + (x.aktivan ? 1 : 0) + '" aria-pressed="' + (x.aktivan ? "true" : "false") + '">' +
              esc(nazivPrograma(x.program)) + " · " + (x.aktivan ? "otvoreno" : "zatvoreno") + "</button>"; }).join("") + "</div></div>";
        }).join("") : '<p class="tekst">Još nema polaznika.</p>') + '<p class="tiho">Klik na program otvara ili zatvara pristup.</p></section>';
      document.getElementById("dodaj").addEventListener("click", function () {
        var mejl = vr("novi-mejl"); var progs = Array.prototype.map.call(document.querySelectorAll('input[name="prog"]:checked'), function (c) { return c.value; });
        if (!/^\S+@\S+\.\S+$/.test(mejl)) return javi("Upiši ispravan mejl.", true);
        if (!progs.length) return javi("Izaberi bar jedan program.", true);
        baza.dodajPristup(mejl, progs).then(function () { javi("Pristup je otvoren za " + mejl + "."); uredPolaznici(mesto); }).catch(function (e) { console.error(e); javi("Nije sačuvano.", true); });
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
    var polja = [["naziv", "Naziv modula"], ["podnaslov", "Podnaslov"], ["vimeo", "Vimeo broj", "text", "Broj iz linka vimeo.com/123456789"], ["trajanje", "Trajanje", "text", "npr. 24 min"],
      ["pismo", "Tvoje pismo pre videa", "dugo"], ["zadatak", "Zadatak za ovu nedelju", "dugo"], ["trebalo", "Šta ti je tada trebalo", "dugo"], ["recenica", "Rečenica na kraju", "text"]];
    mesto.innerHTML = '<div class="cipovi" style="margin-bottom:24px">' + kopija.programi.map(function (x) {
        return '<button class="cip' + (x.id === p.id ? " uklj" : "") + '" data-izaberi="' + esc(x.id) + '">' + esc(x.naziv) + "</button>"; }).join("") + "</div>" +
      '<section class="ured-blok forma-ured"><div class="nadnaslov">Program</div>' +
      polje("p-naziv", "Naziv programa", p.naziv) + polje("p-kratko", "Kratak opis", p.kratko, "text", "Piše ispod naziva u Sobi, npr. 9 modula") +
      polje("p-citat", "Citat u prostoriji", p.citat, "dugo") + polje("p-sveska", "Link do PDF-a (Dnevnik korena ili radna sveska)", sveska ? sveska.link : "", "url") + "</section>" +
      '<section class="ured-blok"><div class="nadnaslov">Moduli</div>' + p.moduli.map(function (m, i) {
        return '<details class="modul-ured"' + (i === 0 ? "" : "") + "><summary><span class=\"broj\">" + esc(m.rim) + "</span> " + esc(m.naziv) + (m.vimeo ? "" : ' <span class="tiho">· bez videa</span>') + "</summary>" +
          '<div class="forma-ured">' + polja.map(function (pl) { return polje("m" + i + "-" + pl[0], pl[1], m[pl[0]], pl[2], pl[3]); }).join("") +
          '<button class="tihi-link ukloni" data-i="' + i + '">Ukloni ovaj modul</button></div></details>';
      }).join("") + '<button class="dugme obrub" id="novi-modul" style="margin-top:20px">Dodaj modul</button></section>' +
      '<div class="ured-sacuvaj"><button class="dugme" id="sacuvaj-sadrzaj">Sačuvaj sadržaj</button></div>';
    function procitaj() {
      p.naziv = vr("p-naziv") || p.naziv; p.kratko = vr("p-kratko"); p.citat = vr("p-citat");
      var link = vr("p-sveska");
      if (sveska) sveska.link = link;
      else if (link) { p.uzProgram = p.uzProgram || []; p.uzProgram.unshift({ naziv: p.id === "koren" ? "Dnevnik korena" : "Radna sveska", opis: "PDF", link: link }); }
      p.moduli.forEach(function (m, i) { polja.forEach(function (pl) { var el = document.getElementById("m" + i + "-" + pl[0]); if (el) m[pl[0]] = el.value.trim(); }); });
    }
    mesto.querySelectorAll("[data-izaberi]").forEach(function (b) { b.addEventListener("click", function () { izabraniProgram = b.dataset.izaberi; uredSadrzaj(mesto); }); });
    document.getElementById("novi-modul").addEventListener("click", function () {
      procitaj(); var n = p.moduli.length;
      p.moduli.push({ id: String(n + 1).padStart(2, "0"), rim: RIM[n] || String(n + 1), naziv: "Novi modul", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" });
      S = kopija; uredSadrzaj(mesto); javi("Modul je dodat. Popuni ga i klikni Sačuvaj sadržaj.");
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

  function uredNaslovna(mesto) {
    var n = PODESAVANJA.naslovna || {};
    mesto.innerHTML = '<section class="ured-blok forma-ured"><div class="nadnaslov">Početna Sobe</div>' +
      polje("n-recenica", "Rečenica ispod pozdrava", n.recenica || "Ne moraš danas sve. Dovoljan je jedan deo.") +
      polje("n-poruka", "Poruka meseca", n.poruka || "", "dugo", "Vide je svi polaznici ispod pozdrava. Ostavi prazno kad ne treba.") +
      izbor("n-slika", "Fotografija na ulazu", SLIKE, n.slikaUlaz || "slike/cvetovi.jpg") +
      '<button class="dugme" id="sacuvaj-naslovnu">Sačuvaj naslovnu</button></section>';
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

  function uredKuponi(mesto) {
    mesto.innerHTML = '<section class="ured-blok"><div class="nadnaslov">Kuponi za popust</div>' +
      '<p class="tekst">Kuponi se prave preko Lemon Squeezy-ja, jer se popust obračunava pri plaćanju. Kad otvoriš Lemon Squeezy nalog, ovde dobijaš formular: kod, iznos popusta, program, rok i najveći broj korišćenja, i listu koliko je puta koji kupon iskorišćen.</p></section>';
  }

  /* ---------- usmeravanje ---------- */
  function prikazi() {
    if (!korisnik) { SADRZAJ_UCITAN = false; JE_UREDNIK = false; return ekranUlaz(); }
    if (!SADRZAJ_UCITAN) return pripremi().then(prikazi);
    var delovi = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    window.scrollTo(0, 0);
    if (delovi[0] === "uredjivanje") return JE_UREDNIK ? ekranUredjivanje(delovi[1] || "pregled") : (location.hash = "#/");
    if (delovi[0] === "dnevnik") return baza.dnevnik().then(function (s) { ekranDnevnik(s, delovi[1]); }).catch(greska);
    Promise.all([baza.pristup(), baza.napredak()]).then(function (r) {
      var pristup = r[0], napredak = r[1];
      if (delovi[0] === "program") { var p = program(delovi[1]); return p ? ekranProgram(p, pristup, napredak) : ekranSoba(pristup, napredak); }
      if (delovi[0] === "modul") {
        var pp = program(delovi[1]); var m = pp && pp.moduli.filter(function (x) { return x.id === delovi[2]; })[0];
        return m ? ekranModul(pp, m, pristup, napredak) : ekranSoba(pristup, napredak);
      }
      if (delovi[0] === "biblioteka") return ekranBiblioteka(pristup, delovi[1]);
      ekranSoba(pristup, napredak);
    }).catch(greska);
  }

  function pripremi() {
    return baza.podesavanja().then(function (p) { PODESAVANJA = p || {}; }).catch(function () {})
      .then(function () {
        if (!korisnik || SADRZAJ_UCITAN) return;
        return Promise.all([baza.jeUrednik(), baza.ucitajSadrzaj()]).then(function (r) {
          JE_UREDNIK = r[0]; if (r[1] && r[1].programi) { S = r[1]; window.SOBA_SADRZAJ = S; }
          SADRZAJ_UCITAN = true;
        }).catch(function (e) { console.error(e); SADRZAJ_UCITAN = true; });
      });
  }

  window.addEventListener("hashchange", prikazi);
  baza.init().then(pripremi).then(prikazi).catch(greska);
})();
