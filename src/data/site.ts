import type { VisualKey } from "@/components/nazzim/ProductVisual";

/**
 * Site-level content for Nazzim.
 * Rule: no invented statistics, ratings, customer counts, or testimonials.
 * Only verified product facts, real attributed quotes, and editable placeholders.
 */

export const brand = {
  name: "Nazzim",
  arabicName: "نظّم",
  tagline: "أنظمة إنتاجية رقمية",
  /** Placeholder — replace with the real support address. */
  email: "hello@nazzim.co",
};

/** Real, factual announcement (matches the current bundle discount). */
export const announcement = "خصم 25٪ على النظام الكامل — وصول رقمي فوري";

export const hero = {
  eyebrow: "تحميل رقمي فوري",
  headline: "نظّم يومك.",
  headlineAccent: "أنجز ما يهمك.",
  sub: "أنظمة إنتاجية رقمية جاهزة تساعدك على تنظيم مهامك، بناء عاداتك، ومتابعة أهدافك — ببساطة وبدون تعقيد.",
  primaryCta: "استكشف الأنظمة",
  secondaryCta: "كيف يعمل نظّم؟",
};

/** Four feature pillars — outcome first. */
export const features = [
  {
    icon: "chart",
    title: "تتبع واضح للتقدم",
    body: "مهامك وعاداتك وأهدافك معروضة بصرياً، لتعرف موقعك بنظرة واحدة بدل التخمين.",
  },
  {
    icon: "calendar",
    title: "هيكل يومي وأسبوعي",
    body: "تخطيط بسيط يساعدك على ترتيب يومك والبقاء مركزاً دون إرهاق أو أدوات معقدة.",
  },
  {
    icon: "unlock",
    title: "استمرارية لا حماس مؤقت",
    body: "التسجيل اليومي القصير يحوّل الالتزام إلى عادة، فتصبح الإنتاجية أسهل مع الوقت.",
  },
  {
    icon: "life",
    title: "مرن مع حياتك",
    body: "عدّل الأقسام والعادات والمهام كما تشاء — النظام يتكيّف مع روتينك لا العكس.",
  },
] as const;

/** Real quotes with real attribution. */
export const quotes = [
  {
    text: "يا ابن آدم، إنما أنت أيام، فإذا ذهب يومك، ذهب بعضك.",
    author: "الحسن البصري",
    role: "إمام وتابعي",
  },
  {
    text: "النجاح ليس قفزة مفاجئة، بل حصيلة مجهودات صغيرة وعادات بسيطة تتراكم يوماً بعد يوم.",
    author: "فهد عامر الأحمدي",
    role: "كاتب ومؤلف",
  },
  {
    text: "التحسين اليومي المستمر ولو بنسبة بسيطة، هو ما يصنع النجاحات العظيمة على المدى الطويل.",
    author: "أحمد الشقيري",
    role: "إعلامي وصانع محتوى",
  },
];

export const worksheets: { visual: VisualKey; name: string; arabicName: string; body: string }[] = [
  {
    visual: "tasks",
    name: "Task Tracker",
    arabicName: "متتبع المهام",
    body: "أدر مهام يومك بوضوح لتنجز أكثر بجهد أقل، مع تواريخ تتحدث تلقائياً لشهر كامل.",
  },
  {
    visual: "habits",
    name: "Habit Tracker",
    arabicName: "متتبع العادات",
    body: "لوحة بصرية تساعدك على الاستمرارية وتتبع عاداتك الشهرية، مع رسوم تعرض نسبة تقدمك.",
  },
  {
    visual: "goals",
    name: "Goal Tracker",
    arabicName: "متتبع الأهداف",
    body: "قسّم أهدافك الكبرى إلى خطوات صغيرة، وتابع إنجازها خطوة بخطوة.",
  },
];

export const benefits = [
  {
    title: "تعرف تقدمك بنظرة واحدة",
    body: "لوحات ورسوم تعرض التزامك بعاداتك وإنجاز مهامك ونسبة تقدمك في أهدافك، بدون حساب يدوي.",
  },
  {
    title: "يوم مرتّب بدون تعقيد",
    body: "هيكل بسيط لتخطيط يومك وأسبوعك، يبقيك متحكماً بجدولك بدل أن تتحكم به المهام.",
  },
  {
    title: "التزام يتحول إلى عادة",
    body: "دقائق قصيرة يومياً للتسجيل والمتابعة كافية لتثبيت الروتين على المدى الطويل.",
  },
  {
    title: "نظام واحد لحياتك وعملك",
    body: "بدل أدوات متفرقة، كل شيء في مكان واحد يمكنك تعديله ليناسبك تماماً.",
  },
];

/** How it works — three verified steps. */
export const steps = [
  { n: "١", title: "اختر نظامك", body: "أداة واحدة تحل مشكلتك الحالية، أو النظام الكامل." },
  { n: "٢", title: "أتمم الطلب", body: "دفعة واحدة، ثم يظهر لك رابط الملف فوراً." },
  { n: "٣", title: "انسخ وابدأ", body: "«إنشاء نسخة» في Google Sheets، وتبدأ التنظيم في دقائق." },
];
