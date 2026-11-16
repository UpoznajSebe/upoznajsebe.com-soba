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
  };

  /* ---------- delovi ekrana ---------- */
  function meni(aktivno) {
    var stavke = [["#/", "soba", "Soba"], ["#/dnevnik", "dnevnik", "Moj dnevnik"], ["#/biblioteka", "bib", "Biblioteka"]];
    return '<nav class="meni" aria-label="Glavni meni"><div class="u">' + stavke.map(function (s) {
      return '<a href="' + s[0] + '"' + (s[1] === aktivno ? ' aria-current="page"' : "") + ">" + ikona(IKONA[s[1]]) + s[2] + "</a>";
    }).join("") + "</div></nav>";
  }
  function zaglavlje(desno) {
    return '<header class="zaglavlje"><a class="logo" href="#/">Upoznaj Sebe</a>' + (desno || "") + "</header>";
  }
  function demoTraka() { return DEMO ? '<div class="demo-traka">Probna verzija · sve što upišeš ostaje samo u ovom pregledaču</div>' : ""; }
  function naslovna(p, visina, velicina) {
    var natpis = p.naslovnaTekst ? '<div class="natpis"><span class="k" style="font-size:' + Math.round(velicina * 0.42) + 'px">' + esc(p.naziv.split(" ")[0]) +
      '</span><span class="a" style="font-size:' + velicina + 'px">' + esc(p.naziv.split(" ").slice(1).join(" ")) + "</span></div>" : "";
    return '<div class="naslovna" style="height:' + visina + 'px"><img src="' + p.slika + '" alt="' + esc(p.naziv) + '"><div class="sloj"></div>' + natpis + "</div>";
  }
  function greska(e) {
    console.error(e);
    app.innerHTML = '<div class="ekran">' + zaglavlje() + '<div class="okvir" style="padding-top:48px;display:flex;flex-direction:column;gap:18px">' +
      '<h1>Nešto <em>nije stiglo.</em></h1><p class="tekst">Osveži stranicu za minut. Ako se ponovi, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</p></div></div>";
  }

  /* ---------- ekrani ---------- */
  function ekranUlaz(poruka) {
    app.innerHTML = '<main class="ekran" style="padding-bottom:40px">' + demoTraka() +
      '<div class="ulaz-slika"><img src="slike/cvetovi.jpg" alt=""><div class="sloj"></div>' +
      '<div class="vrh"><span class="logo" style="color:#fff">Upoznaj Sebe</span></div>' +
      '<div class="dno"><span class="ozn">Tvoja soba</span><h1>Upoznaj<em>sebe.</em></h1></div></div>' +
      '<form id="forma" class="okvir" style="padding-top:36px;display:flex;flex-direction:column;gap:22px" novalidate>' +
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
    var h = '<main class="ekran">' + demoTraka() + zaglavlje('<button class="malo-dugme" id="odjava">Odjava</button>') +
      '<div class="okvir" style="padding-top:40px;display:flex;flex-direction:column;gap:14px">' +
      '<div class="nadnaslov">' + DANI[new Date().getDay()] + "</div>" +
      "<h1>Dobro <em>" + pozdrav() + ".</em></h1>" +
      '<p class="tekst">Ne moraš danas sve. Dovoljan je jedan deo.</p></div>';
    if (dalje) {
      var gotovoDeo = dalje.m && dalje.poz ? '<p class="tiho">Stao si na ' + vreme(dalje.poz) + "</p>" : "";
      h += '<section class="kartica" style="margin:36px 24px 0" aria-label="Nastavi gde si stao">' + naslovna(dalje.p, 190, 34) +
        '<div style="padding:24px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="nadnaslov">' + (dalje.novo ? "Kreni odavde" : "Nastavi gde si stao") + "</div>" +
        "<h2>Modul " + esc(dalje.m.rim) + " · <em>" + esc(dalje.m.naziv) + "</em></h2>" + gotovoDeo +
        '<a class="dugme" style="margin-top:8px" href="#/modul/' + dalje.p.id + "/" + dalje.m.id + '">' + (dalje.novo ? "Počni" : "Nastavi") + "</a></div></section>";
    }
    if (moji.length) {
      h += '<section class="okvir" style="padding-top:40px;display:flex;flex-direction:column;gap:12px" aria-label="Tvoje prostorije"><div class="nadnaslov">Tvoje prostorije</div>' +
        moji.map(function (p) {
          var g = p.moduli.filter(function (m) { var x = napredak[p.id + "/" + m.id]; return x && x.gotovo; }).length;
          return '<a class="prostorija" href="#/program/' + p.id + '"><img src="' + p.slika + '" alt=""><span style="flex:1;display:flex;flex-direction:column;gap:4px"><span class="ime">' +
            esc(p.naziv) + '</span><span class="tiho">' + esc(p.kratko) + (g ? " · prošao si " + g : "") + "</span></span>" + STRELICA + "</a>";
        }).join("") + "</section>";
    } else {
      h += '<div class="okvir" style="padding-top:36px"><div class="poruka">Na ovom mejlu još nema otvorenih programa. Ako si kupio program sa drugim mejlom, odjavi se i uđi sa njim. Ako ne uspeš, piši na <a href="mailto:' + esc(C.MEJL_PODRSKE) + '">' + esc(C.MEJL_PODRSKE) + "</a>.</div></div>";
    }
    var predlozi = ostali.map(function (p) { return { naziv: p.naziv, slika: p.slika }; })
      .concat(nemaBib.map(function (b) { return { naziv: b.naziv, slika: b.slika }; }));
    if (predlozi.length) {
      var pr = predlozi[0];
      h += '<a href="https://upoznajsebe.com/" target="_blank" rel="noopener" style="margin:32px 24px 0;padding-top:22px;border-top:1px solid var(--bd);display:flex;align-items:center;gap:14px;text-decoration:none;color:var(--tx);min-height:44px">' +
        '<img src="' + pr.slika + '" alt="" style="width:56px;height:56px;object-fit:cover;flex:none"><span><span class="nadnaslov" style="font-size:10px">Još iz Upoznaj Sebe</span>' +
        '<span style="display:block;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--ink)">' + esc(pr.naziv) + "</span></span></a>";
    }
    h += "</main>" + meni("soba");
    app.innerHTML = h;
    document.getElementById("odjava").addEventListener("click", function () { baza.odjava().then(prikazi); });
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
    var h = '<main class="ekran">' + demoTraka() + '<div style="position:relative">' + naslovna(p, 260, 42) +
      '<a href="#/" class="malo-dugme" style="position:absolute;top:16px;left:16px;background:rgba(250,248,244,.92);color:var(--pl);padding:0 16px">← Soba</a></div>';
    if (p.citat) h += '<div class="okvir" style="padding-top:36px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">' +
      '<p style="font-family:var(--serif);font-style:italic;font-weight:300;font-size:25px;line-height:1.4;color:var(--ink)">„' + esc(p.citat) + '”</p><span class="tiho" style="letter-spacing:.24em;text-transform:uppercase;font-size:10.5px">Milica Bilbija</span></div>';
    else h += '<div class="okvir" style="padding-top:36px"><h1>' + esc(p.naziv) + "</h1></div>";
    h += '<section class="okvir" style="padding-top:36px" aria-label="Moduli"><div class="nadnaslov">Moduli</div><div style="padding-top:8px">' +
      p.moduli.map(function (m) {
        var st = statusModula(p, m, napredak, tren);
        return '<a class="red ' + st[0] + '" href="#/modul/' + p.id + "/" + m.id + '"><span class="broj">' + esc(m.rim) + '</span><span style="flex:1"><span class="naziv">' + esc(m.naziv) + "</span>" +
          (m.podnaslov ? '<span class="pod">' + esc(m.podnaslov) + "</span>" : "") + (st[1] ? '<span class="status">' + st[1] + "</span>" : "") + "</span></a>";
      }).join("") + "</div></section>";
    var uz = (p.uzProgram || []).filter(function (u) { return link(u.link); });
    if (uz.length) h += '<section class="okvir" style="padding-top:36px;display:flex;flex-direction:column;gap:14px" aria-label="Uz program"><div class="nadnaslov">Uz program</div><div class="mreza3">' +
      uz.map(function (u) { var l = link(u.link); var spolja = /^https?:/.test(l);
        return '<a class="plocica" href="' + esc(l) + '"' + (spolja ? ' target="_blank" rel="noopener"' : "") + ">" + esc(u.naziv) + "<small>" + esc(u.opis) + "</small></a>"; }).join("") + "</div></section>";
    h += "</main>" + meni("soba");
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
    var h = '<main class="ekran">' + demoTraka() + '<div class="okvir" style="padding-top:22px;display:flex;flex-direction:column;gap:30px">' +
      '<a class="malo-dugme" href="#/program/' + p.id + '">← ' + esc(p.naziv) + "</a>" +
      '<div style="display:flex;flex-direction:column;gap:12px"><div class="nadnaslov">Modul ' + esc(m.rim) + "</div><h1>" + esc(m.naziv) + "</h1>" +
      (m.podnaslov ? '<p class="tekst">' + esc(m.podnaslov) + "</p>" : "") + "</div>";
    h += '<section style="display:flex;flex-direction:column;gap:10px" aria-label="Video"><div class="video">' +
      (m.vimeo ? '<iframe id="vimeo" src="https://player.vimeo.com/video/' + encodeURIComponent(m.vimeo) + '?dnt=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="' + esc(m.naziv) + '"></iframe>'
        : '<img src="' + p.slika + '" alt=""><div class="prazno">Video uskoro</div>') + "</div>" +
      '<span class="tiho" id="vreme">' + (x.gotovo ? "Odgledano" : x.pozicija ? "Nastavljaš od " + vreme(x.pozicija) : m.trajanje ? "Trajanje " + esc(m.trajanje) : "") + "</span></section>";
    if (m.pismo) h += '<section class="pismo" aria-label="Reč od Milice"><div class="glava"><img src="slike/milica.jpg" alt="Milica Bilbija"><span><span class="nadnaslov" style="font-size:10px">Pre videa</span>' +
      '<span style="display:block;font-family:var(--serif);font-size:19px;color:var(--ink)">Reč od Milice</span></span></div><p class="tekst">' + esc(m.pismo) + '</p><span class="potpis">Milica</span></section>';
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
      '<a class="tihi-link" href="#/">Završio sam za danas</a></div></div></main>' + meni("soba");
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
    var h = '<main class="ekran">' + demoTraka() + zaglavlje() + '<div class="okvir" style="padding-top:40px;display:flex;flex-direction:column;gap:14px">' +
      '<div class="nadnaslov">Samo tvoj</div><h1 style="font-size:52px">Moj <em>dnevnik</em></h1>' +
      '<p class="tekst">Ovde nema zadataka ni pitanja. Piši šta god želiš da zabeležiš o sebi.</p></div>' +
      '<section class="stranica" style="margin:30px 24px 0" aria-label="Stranica dnevnika"><span class="datum">' + lepDatum(tr.datum) + "</span>" +
      '<label for="stranica" class="vidljivo-citacu">Tvoja stranica</label><textarea id="stranica" placeholder="Počni gde god želiš...">' + esc(tr.tekst) + "</textarea>" +
      '<div style="display:flex;justify-content:space-between;align-items:center"><span class="tiho" id="stanje" role="status">' + (tr.tekst ? "Sačuvano" : "Čuva se samo od sebe") + "</span>" +
      (otvorena && otvorena.datum !== danas() ? '<a class="malo-dugme" style="color:var(--pl)" href="#/dnevnik">Današnja stranica</a>' : "") + "</div></section>";
    if (ranije.length) h += '<section class="okvir" style="padding-top:34px" aria-label="Ranije stranice"><div class="nadnaslov">Ranije stranice</div>' +
      ranije.map(function (s) { return '<button class="unos" data-id="' + esc(s.id) + '"><span class="d">' + lepDatum(s.datum) + '</span><span class="t">' + esc(s.tekst) + "</span></button>"; }).join("") + "</section>";
    h += "</main>" + meni("dnevnik");
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
    var h = '<main class="ekran">' + demoTraka() + '<div style="height:230px;position:relative;overflow:hidden"><img src="' + (otvorena ? otvorena.slika : "slike/relaksacija.jpg") + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>' +
      '<div class="okvir" style="padding-top:36px;display:flex;flex-direction:column;gap:14px"><div class="nadnaslov">Biblioteka</div>' +
      '<h1 style="font-size:42px">Za večeri kad ti <em>treba mir</em></h1><p class="tekst">Slušaj sa slušalicama, u tišini.</p></div>';
    if (otvorena) h += '<section class="okvir" style="padding-top:24px;display:flex;flex-direction:column;gap:10px"><div class="video">' +
      (otvorena.vimeo ? '<iframe src="https://player.vimeo.com/video/' + encodeURIComponent(otvorena.vimeo) + '?dnt=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen" allowfullscreen title="' + esc(otvorena.naziv) + '"></iframe>'
        : '<img src="' + otvorena.slika + '" alt=""><div class="prazno">Snimak uskoro</div>') + '</div><span class="tiho">' + esc(otvorena.naziv) + "</span></section>";
    h += '<section class="okvir" style="padding-top:28px" aria-label="Relaksacije"><div class="nadnaslov">Relaksacije</div>' +
      (stavke.length ? stavke.map(function (b) {
        return '<a class="red" href="#/biblioteka/' + b.id + '"><span style="width:46px;height:46px;border-radius:50%;border:1px solid var(--pl);display:flex;align-items:center;justify-content:center;flex:none"><svg width="13" height="13" viewBox="0 0 24 24" fill="#3D2440" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>' +
          '<span style="flex:1"><span class="naziv" style="font-size:22px">' + esc(b.naziv) + '</span><span class="pod">' + esc(b.opis) + "</span></span></a>";
      }).join("") : '<p class="tekst" style="padding-top:12px">Ovde će biti relaksacije iz tvojih programa.</p>') + "</section>";
    var mape = S.programi.filter(function (p) { return pristup.indexOf(p.id) >= 0 && link(p.mapa); });
    if (mape.length) h += '<section class="okvir" style="padding-top:28px" aria-label="Za čitanje"><div class="nadnaslov">Za čitanje</div>' +
      mape.map(function (p) { return '<a class="red" href="' + esc(link(p.mapa)) + '" target="_blank" rel="noopener"><span style="flex:1"><span class="naziv" style="font-size:22px">Mapa pojmova</span><span class="pod">' + esc(p.naziv) + "</span></span>" + STRELICA + "</a>"; }).join("") + "</section>";
    h += "</main>" + meni("bib");
    app.innerHTML = h;
  }

  /* ---------- usmeravanje ---------- */
  function prikazi() {
    if (!korisnik) return ekranUlaz();
    var delovi = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    window.scrollTo(0, 0);
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

  window.addEventListener("hashchange", prikazi);
  baza.init().then(prikazi).catch(greska);
})();
