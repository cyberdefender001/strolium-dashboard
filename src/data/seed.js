export const seed = {
  org: { name: "Qurilish Test", period: "Iyun 2026" },

  overview: {
    budgetAtRisk: 12400000,
    leakageFlagged: 8200000,
    recovered: 5100000,
    openFlags: 5,
  },

  // weekly leakage caught (so'm) — for the trend sparkline
  trend: [1200000, 900000, 2100000, 1700000, 2300000, 5100000],

  flags: [
    {
      id: "f1",
      type: "short_delivery",
      icon: "truck",
      severity: "high",
      title: "Kam yetkazib berish — Obyekt B",
      site: "Obyekt B · Sement ombori",
      desc: "500 buyurtma · 480 yetkazildi · ~430 ishlatilgan",
      amount: -7000000,
      lossNote: "70 qop sement hisobda yo'q",
      trail: { ordered: 500, delivered: 480, used: 430, paid: 500, unit: "qop" },
      explain:
        "Hisob-faktura 500 qop sement uchun to'langan. Yetkazib berish hujjatlari 480 qopni tasdiqlaydi, obyekt fotosuratlari esa ~430 qop ishlatilganini ko'rsatadi. 70 qop (~7.0 mln so'm) hisobdan tushmagan.",
      evidence: [
        { kind: "doc", text: "Yetkazib berish varaqasi — 480 qop" },
        { kind: "photo", text: "Darvoza fotosurati — 14:32, GPS tasdiqlangan" },
        { kind: "invoice", text: "Hisob-faktura #2261 — 500 qop" },
        { kind: "photo", text: "Ombor fotosurati — ~430 qop ishlatilgan" },
      ],
    },
    {
      id: "f2",
      type: "ghost_worker",
      icon: "userx",
      severity: "high",
      title: "Soxta ishchi",
      site: "Obyekt A · Davomat",
      desc: "Bir yuz, ikki ism bilan ro'yxatdan o'tgan",
      amount: -1200000,
      lossNote: "oyiga taxminiy yo'qotish",
      explain:
        "Davomat tizimi bir xil yuzni ikki xil ism ostida qayd etgan (selfie + GPS). Bu bir kishi ikki maosh olayotganini yoki mavjud bo'lmagan ishchi qo'shilganini bildiradi. Oyiga ~1.2 mln so'm.",
      evidence: [
        { kind: "photo", text: "Selfie — \"Akmal T.\" · 08:14" },
        { kind: "photo", text: "Selfie — \"Akram T.\" · 08:15 (bir xil yuz)" },
        { kind: "doc", text: "Yuzni solishtirish: 0.96 o'xshashlik" },
      ],
    },
    {
      id: "f3",
      type: "rubber_stamp",
      icon: "stamp",
      severity: "med",
      title: "Tez tasdiqlash",
      site: "Nazoratchi A",
      desc: "18 ta hisobot 3 soniyadan kam vaqtda tasdiqlangan",
      amount: 0,
      lossNote: "nazorat xavfi — summa aniqlanmagan",
      explain:
        "Nazoratchi A so'nggi 18 ta hisobotni har birini 3 soniyadan kam vaqtda tasdiqlagan — ya'ni fotosurat va hujjatlarni ko'rmasdan. Bu \"shtamp bosish\" xatti-harakati boshqa firibgarliklarni yashirishi mumkin.",
      evidence: [
        { kind: "doc", text: "18 ta tasdiq · o'rtacha 1.8 soniya" },
        { kind: "doc", text: "Solishtirma: boshqa nazoratchilar — o'rtacha 47 soniya" },
      ],
    },
    {
      id: "f4",
      type: "under_threshold",
      icon: "receipt",
      severity: "med",
      title: "Limitdan past hisob-faktura",
      site: "Ta'minotchi: BetonStroy",
      desc: "9.8 mln (limit 10 mln) · bu hafta 3-marta",
      amount: -2900000,
      lossNote: "3 ta hisob-faktura yig'indisi",
      explain:
        "Uchta hisob-faktura ataylab tasdiqlash chegarasidan (10 mln so'm) bir oz past — 9.8 mln so'm — qo'yilgan. Bu rahbar tasdig'idan qochish uchun summalarni bo'lib yuborish belgisidir.",
      evidence: [
        { kind: "invoice", text: "#2270 — 9.8 mln · 02.06" },
        { kind: "invoice", text: "#2274 — 9.7 mln · 04.06" },
        { kind: "invoice", text: "#2279 — 9.9 mln · 06.06" },
      ],
    },
    {
      id: "f5",
      type: "duplicate_invoice",
      icon: "copy",
      severity: "med",
      title: "Takroriy hisob-faktura",
      site: "Ta'minotchi: Armatura Plus",
      desc: "Bir xil hisob-faktura ikki marta to'langan",
      amount: -4500000,
      lossNote: "ikki marta to'lov",
      explain:
        "#2255 raqamli hisob-faktura (4.5 mln so'm) ikki xil sanada ikki marta to'langan. Tizim bir xil raqam, summa va ta'minotchini aniqladi.",
      evidence: [
        { kind: "invoice", text: "#2255 — 4.5 mln · to'landi 28.05" },
        { kind: "invoice", text: "#2255 — 4.5 mln · to'landi 03.06 (takror)" },
      ],
    },
  ],

  reconciliation: [
    { material: "Sement (M400)", site: "Obyekt B", ordered: 500, delivered: 480, used: 430, unit: "qop", status: "bad" },
    { material: "Armatura 12mm", site: "Obyekt B", ordered: 8, delivered: 8, used: 7.6, unit: "tonna", status: "ok" },
    { material: "G'isht", site: "Obyekt A", ordered: 40000, delivered: 39200, used: 38900, unit: "dona", status: "warn" },
    { material: "Qum", site: "Obyekt A", ordered: 120, delivered: 120, used: 118, unit: "m³", status: "ok" },
    { material: "Bo'yoq", site: "Obyekt C", ordered: 200, delivered: 180, used: 175, unit: "litr", status: "warn" },
  ],

  projects: [
    { name: "Obyekt A — Turar-joy", budget: 1800000000, spent: 1120000000, status: "Faol" },
    { name: "Obyekt B — Ofis markazi", budget: 2400000000, spent: 980000000, status: "Faol" },
    { name: "Obyekt C — Ombor", budget: 600000000, spent: 540000000, status: "Yakunlanmoqda" },
  ],

  workers: [
    { name: "Akmal Tursunov", role: "Ishchi", site: "Obyekt A", flag: "Soxta ishchi" },
    { name: "Bekzod Aliyev", role: "Ishchi", site: "Obyekt B", flag: null },
    { name: "Dilshod Karimov", role: "Nazoratchi", site: "Obyekt A", flag: "Tez tasdiqlash" },
    { name: "Sardor Yusupov", role: "Ishchi", site: "Obyekt B", flag: null },
    { name: "Jasur Rahimov", role: "Ishchi", site: "Obyekt C", flag: null },
  ],
};

// The audit layer is demo data until the audit brain (step 2) computes it from
// real uploaded delivery notes / invoices. Surfaced with a "namuna" tag in the UI.
export const demoAudit = {
  overview: seed.overview,
  flags: seed.flags,
  trend: seed.trend,
  reconciliation: seed.reconciliation,
};
