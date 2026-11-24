// Sadržaj Prostora: programi, moduli i Biblioteka.
// Nov modul se dodaje tako što se doda jedan red u listu "moduli".
// vimeo: broj videa sa Vimeo-a (iz linka vimeo.com/123456789). Prazno = video još nije postavljen.
// sveska: link ka PDF-u (Dnevnik korena ili radna sveska). Prazno = nema.

window.SOBA_SADRZAJ = {
  programi: [
    {
      id: "koren",
      mesecno: true, // na rate se otvara deo po deo
      naziv: "Koren anksioznosti",
      kratko: "9 modula",
      slika: "slike/cvetovi.jpg",
      naslovnaTekst: true,
      citat: "Odrasla osoba koja je stalno anksiozna bila je dete koje je živelo u strahu.",
      mapa: "LINK_MAPA_KORENA",
      uzProgram: [
        { naziv: "Dnevnik korena", opis: "PDF · piši rukom, modul po modul", link: "" },
        { naziv: "Vođena relaksacija", opis: "Biblioteka", link: "#/biblioteka" },
        { naziv: "Mapa pojmova", opis: "Reči za ono što osećaš", link: "LINK_MAPA_KORENA" },
      ],
      moduli: [
        { id: "01", rim: "I", naziv: "Odakle dolazi nemir", podnaslov: "Zašto se anksioznost vraća i posle svake tehnike", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Sedam dana, svako veče, zapiši jedan trenutak kad se nemir javio i jednu reč za ono što je telo radilo.",
          trebalo: "Da razumeš odakle nemir dolazi, umesto da ga svaki put samo gasiš.", recenica: "Hoću da znam odakle ovo dolazi." },
        { id: "02", rim: "II", naziv: "Pre prvih reči", podnaslov: "Strah bez povoda i telo koje ne ume da se odmori", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Pitaj nekoga iz porodice kakav si bio kao beba i šta se tada dešavalo u kući. Ako nemaš koga da pitaš, zapiši šta zamišljaš.",
          trebalo: "Neko ko je miran umesto tebe, dok ti ne naučiš.", recenica: "Tu sam. Ne moraš ništa da uradiš." },
        { id: "03", rim: "III", naziv: "Prvi koraci", podnaslov: "Zašto ti je teško da počneš baš ono što želiš", vimeo: "", trajanje: "",
          pismo: "Ovaj modul je o detetu koje je htelo da dira, otvara i pita, a čulo je „ne diraj”, „sedi mirno”, „pazi da ne polomiš”. Gledaj ga kad imaš pola sata samo za sebe, ne usput.",
          zadatak: "Izaberi jednu malu stvar koju odlažeš. Uradi samo prvi korak, ne celu stvar. Zapiši šta je telo radilo pre, tokom i posle.",
          trebalo: "Da neko kaže: idi, probaj, tu sam ako padneš.", recenica: "Smem da probam i da se vratim." },
        { id: "04", rim: "IV", naziv: "Prvo „ne”", podnaslov: "Ljutnja, neslaganje i cena odvajanja", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Ove nedelje izgovori jedno malo „ne”. Odbij poziv, uslugu ili kafu. Zapiši šta se desilo u tebi, a šta se zaista desilo spolja.",
          trebalo: "Da neko izdrži tvoju ljutnju i ostane tu.", recenica: "Mogu da se ne slažem, i da me i dalje vole." },
        { id: "05", rim: "V", naziv: "Mašta koja plaši", podnaslov: "Um koji unapred odigra najgori scenario", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Kad se javi najgori scenario, zapiši ga do kraja. Ispod njega napiši još dva ishoda: jedan sasvim običan i jedan dobar.",
          trebalo: "Da neko izdrži tvoje strahove, bez umanjivanja.", recenica: "Hajde da pogledamo zajedno." },
        { id: "06", rim: "VI", naziv: "Škola i ocene", podnaslov: "Kad vrediš onoliko koliko postigneš", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Jedno popodne ove nedelje ne radi ništa korisno. Zapiši šta je telo radilo i koje misli su dolazile.",
          trebalo: "Da neko razdvoji tebe od tvog učinka.", recenica: "Vredan sam i kad ništa ne uradim." },
        { id: "07", rim: "VII", naziv: "Odrastanje", podnaslov: "Pripadanje, telo i odlazak od kuće", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Nađi svoju fotografiju iz tinejdžerskih dana. Napiši sebi tada pismo: šta tada nije smelo da se kaže i šta danas znaš.",
          trebalo: "Da neko preuzme brigu, pa da ti budeš samo dete.", recenica: "Smem da odem i da i dalje pripadam." },
        { id: "08", rim: "VIII", naziv: "Odnosi", podnaslov: "Kad te tuđa tišina plaši i kad ostaješ tamo gde boli", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Sledeći put kad te nečija tišina uznemiri, pre nego što pošalješ poruku, zapiši: šta osećam, koliko godina se osećam i šta mi zaista treba.",
          trebalo: "Neko ko ostaje, i kad ga ne vidiš.", recenica: "Ovo što osećam starije je od ove poruke." },
        { id: "09", rim: "IX", naziv: "Krug koji se vraća", podnaslov: "Kako da prepoznaš stari nemir kad se ponovo javi", vimeo: "", trajanje: "",
          pismo: "", zadatak: "Napiši tri rečenice koje ćeš čitati kad se nemir vrati. Svojim rečima, onako kako bi razgovarao sa sobom kao detetom.",
          trebalo: "Da imaš kome da se okreneš kad se stari nemir vrati.", recenica: "Znam odakle ovo dolazi i znam šta mi treba." },
      ],
    },
    {
      id: "povratak",
      mesecno: true, // jedan modul za svaku uplatu
      naziv: "Povratak sebi",
      kratko: "8 modula",
      slika: "slike/more.jpg",
      naslovnaTekst: false,
      citat: "",
      mapa: "LINK_MAPA_POVRATAK",
      uzProgram: [
        { naziv: "Radna sveska", opis: "PDF · mapa povratka sebi", link: "" },
        { naziv: "Mapa pojmova", opis: "Reči za ono što osećaš", link: "LINK_MAPA_POVRATAK" },
      ],
      moduli: [
        { id: "01", rim: "I", naziv: "Ko je unutrašnje dete?", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "02", rim: "II", naziv: "Drajveri i strategije preživljavanja", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "03", rim: "III", naziv: "Skriptna uverenja iz detinjstva", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "04", rim: "IV", naziv: "Relacione potrebe", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "05", rim: "V", naziv: "Unutrašnje dete u vezama", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "06", rim: "VI", naziv: "Kontakt sa unutrašnjim detetom", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "07", rim: "VII", naziv: "Žalovanje i puštanje", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
        { id: "08", rim: "VIII", naziv: "Novi odnos prema sebi", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
      ],
    },
    {
      // Članstvo: svakog meseca jedan video i tekstovi. Povratak sebi uključuje ovu prostoriju.
      id: "mesecna-soba",
      tip: "clanstvo",
      naziv: "Kutak",
      kratko: "Svakog meseca novo",
      slika: "slike/mesecna.jpg",
      naslovnaTekst: false,
      citat: "",
      uvod: "",
      prodaja: "",
      uzProgram: [],
      moduli: [
        { id: "01", rim: "I", mesec: "Decembar 2026", naziv: "Prvi mesec", podnaslov: "", vimeo: "", trajanje: "", pismo: "", zadatak: "", trebalo: "", recenica: "" },
      ],
    },
  ],
  // Prodajne stranice (javne, i za one koji još nisu kupili). Sve se menja u Uređivanje → Ponuda.
  ponuda: {
    "mesecna-soba": {
      cena: "19 € mesečno", nacin: "Mesečna članarina. Otkazuješ kad želiš.",
      podnaslov: "Jedan video mesečno i tekstovi koje čitaš svojim tempom",
      zaKoga: "Za tebe ako želiš da redovno budeš uz sebe, malo po malo, bez velikog programa. Ako ti prija da jednom mesečno sedneš, pogledaš, pročitaš i zapišeš šta se u tebi pomerilo.",
      opis: "Svakog meseca u Kutku stiže novi video i tekstovi u kojima korak po korak razlažemo priče koje nosimo iz detinjstva: šta smo tada zaključili o sebi i kako to danas živimo.",
      dobijas: "Novi video svakog meseca\nTekstovi uz svaki video\nVežba za taj mesec\nMoj dnevnik, prostor samo za tebe",
      kupi: "", cenaRate: "", kupiRate: "",
    },
    koren: {
      cena: "229 €", cenaRate: "4 × 60 €", nacin: "Program je tvoj 3 godine. Uz program dobijaš 6 meseci Kutka na poklon.",
      podnaslov: "Odakle dolazi tvoj nemir",
      zaKoga: "Za tebe ako se budiš sa stegom u grudima pre nego što se išta desilo. Ako posle svakog razgovora u glavi vrtiš šta si rekao. Ako se smiriš tek kad sve proveriš, pa sutra kreneš ispočetka.",
      opis: "Devet modula prolazi kroz tvoje odrastanje, od vremena pre prvih reči do odnosa koje danas imaš. U svakom vidiš gde je nemir naučen i šta ti je tada trebalo. Kad platiš odjednom, odmah dobijaš ceo program. Na rate se otvara deo po deo, sa svakom ratom.",
      dobijas: "9 video modula, svaki sa zadatkom\nDnevnik korena, radna sveska uz program\nVođena relaksacija\nMapa pojmova\n6 meseci Kutka na poklon\nPristup 3 godine",
      kupi: "", kupiRate: "",
    },
    povratak: {
      cena: "299 €", cenaRate: "8 × 40 €", nacin: "Program je tvoj 3 godine. Uz program dobijaš 6 meseci Kutka na poklon.",
      podnaslov: "Rad sa detetom koje si bio",
      zaKoga: "Za tebe ako znaš da budeš dobar, koristan i jak, a ne znaš šta tebi treba. Ako se u vezama prilagođavaš dok ne nestaneš, pa se onda ljutiš na sebe.",
      opis: "Osam modula, uz svaki vođena fantazija i radna sveska. Polako upoznaješ dete koje si bio i učiš da budeš uz njega. Kad platiš odjednom, odmah dobijaš ceo program. Na rate se otvara jedan modul sa svakom ratom.",
      dobijas: "8 video modula\n8 vođenih fantazija\n8 radnih sveski\n6 meseci Kutka na poklon\nPristup 3 godine",
      kupi: "", kupiRate: "",
    },
    "relaksacija-novac": {
      cena: "15 €", nacin: "Jednokratno. Slušaš kad god ti treba.",
      podnaslov: "Vođena fantazija o novcu i primanju",
      zaKoga: "Za tebe ako ti se grlo stegne kad treba da kažeš cenu. Ako lako daješ, a teško primaš, i novac ti ode čim stigne.",
      opis: "Vođena fantazija kroz koju vidiš šta ti je o novcu rečeno dok si bio mali i kako to danas utiče na to koliko sebi dozvoljavaš.",
      dobijas: "Vođena fantazija u Biblioteci\nSlušaš je kad god ti treba",
      kupi: "", cenaRate: "", kupiRate: "",
    },
  },
  biblioteka: [
    { id: "relaksacija-novac", program: "relaksacija-novac", naziv: "Relaksacija za rad sa novcem", opis: "Vođena fantazija", vimeo: "", slika: "slike/relaksacija.jpg" },
    { id: "relaksacija-koren", program: "koren", naziv: "Vođena relaksacija", opis: "Koren anksioznosti · 18 min", vimeo: "", slika: "slike/cvetovi.jpg" },
  ],
};
