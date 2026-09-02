/**
 * Central product data layer for Nazzim.
 * Adding a product = adding one entry here. No product facts are hard-coded in components.
 * Prices/facts reflect the current catalogue. Anything unverified is marked as editable placeholder.
 */

export type ProductCategory = "habits" | "tasks" | "bundle";

export interface Product {
  id: string;
  name: string;
  arabicName: string;
  slug: string;
  /** Benefit-first one-liner used on cards. */
  description: string;
  longDescription: string;
  /** Who it is for. */
  audience: string[];
  price: number;
  compareAtPrice?: number;
  /** visual key rendered by <ProductVisual /> / <Shot />, no stock photography */
  image: string;
  gallery: string[];
  /** Outcome-first bullets (benefit, not raw feature). */
  features: string[];
  whatYouGet: string[];
  requirements: string[];
  category: ProductCategory;
  featured: boolean;
  badge?: string;
  /**
   * Paddle Billing price id (e.g. "pri_01h...").
   * Left undefined on purpose — copy the real id from the Paddle dashboard
   * (Catalogue > Products > Prices). Until it is filled, the product cannot be
   * purchased and the store shows the "setup in progress" state.
   */
  paddlePriceId?: string;
}


export const CURRENCY = "$";
export const CURRENCY_CODE = "USD";

export const products: Product[] = [
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    arabicName: "متتبع العادات",
    slug: "habit-tracker",
    description: "تابع عاداتك اليومية في لوحة واحدة، وشاهد استمراريتك تكبر شهراً بعد شهر.",
    longDescription:
      "نظام لمتابعة العادات داخل Google Sheets. تحدد عاداتك مرة واحدة، تسجّل التزامك كل يوم بنقرة، وترى نسبة استمراريتك في لوحة بصرية واضحة — بدون إعدادات معقدة ولا تطبيقات إضافية.",
    audience: [
      "من يبدأ عادة جديدة ويريد ألا يفقد الاستمرارية",
      "من يفضّل لوحة بصرية بسيطة على التطبيقات المزدحمة",
    ],
    price: 9,
    image: "habits",
    gallery: ["habits", "system", "progress"],
    features: [
      "تابع عاداتك الشهرية في شبكة واحدة تُقرأ بنظرة واحدة",
      "اعرف نسبة التزامك بكل عادة عبر رسوم تتحدث تلقائياً",
      "لا تفقد سلسلة الاستمرارية — الأيام المنجزة تظهر بوضوح",
      "عدّل العادات وأضف غيرها في أي وقت بدون كسر الملف",
    ],
    whatYouGet: [
      "ملف Google Sheets جاهز — انسخه وابدأ",
      "صفحة إعداد سريعة لعاداتك",
      "تعليمات استخدام مختصرة بالعربية داخل الملف",
    ],
    requirements: ["حساب Google", "متصفح حديث", "لا يحتاج اشتراكاً شهرياً"],
    category: "habits",
    featured: false,
  },
  {
    id: "tasks-goals",
    name: "Tasks & Goals",
    arabicName: "متتبع المهام والأهداف",
    slug: "tasks-goals",
    description: "نظّم مهام يومك، وحوّل أهدافك الكبيرة إلى خطوات صغيرة يمكن إنجازها.",
    longDescription:
      "نظام يجمع إدارة المهام مع متابعة الأهداف في ملف واحد. تكتب مهام يومك وترتّبها بالأولوية، وتربطها بأهدافك حتى يبقى عملك اليومي متصلاً بما يهمك فعلاً. التواريخ تتحدث تلقائياً لشهر كامل بعد إدخال الشهر والسنة مرة واحدة.",
    audience: [
      "من يريد يوماً واضحاً بلا قوائم مبعثرة",
      "من لديه أهداف كبيرة ويحتاج تقسيمها إلى خطوات",
    ],
    price: 9,
    image: "tasks",
    gallery: ["tasks", "goals", "system"],
    features: [
      "أدر مهام يومك بأولويات وحالات واضحة، لتنجز أكثر بجهد أقل",
      "تواريخ شهر كامل تتحدث تلقائياً بمجرد إدخال الشهر والسنة",
      "قسّم كل هدف إلى خطوات صغيرة قابلة للتنفيذ",
      "تابع نسبة تقدمك في كل هدف بدون حساب يدوي",
    ],
    whatYouGet: [
      "ملف Google Sheets جاهز — انسخه وابدأ",
      "صفحة مهام وصفحة أهداف مرتبطتان",
      "تعليمات استخدام مختصرة بالعربية داخل الملف",
    ],
    requirements: ["حساب Google", "متصفح حديث", "لا يحتاج اشتراكاً شهرياً"],
    category: "tasks",
    featured: false,
  },
  {
    id: "nazzim-complete",
    name: "Nazzim Complete System",
    arabicName: "نظام نظّم الكامل",
    slug: "nazzim-complete-system",
    description: "المهام والعادات والأهداف في نظام واحد متكامل — بسعر أقل من شرائها منفصلة.",
    longDescription:
      "النظام الكامل من نظّم: العادات والمهام والأهداف داخل نظام واحد متسق، مع لوحة تجمع صورة أسبوعك في مكان واحد. مناسب لمن يريد نظاماً واحداً يدير به حياته وعمله بدل أدوات متفرقة.",
    audience: [
      "من يريد نظاماً واحداً لكل شيء بدل ملفات متفرقة",
      "من يخطط لعمله ودراسته وحياته في نفس المكان",
    ],
    price: 13.5,
    compareAtPrice: 18,
    image: "system",
    gallery: ["system", "habits", "tasks", "dashboard", "goals"],
    features: [
      "كل أدوات نظّم في نظام واحد: مهام، عادات، أهداف",
      "لوحة واحدة تعرض صورة أسبوعك كاملة",
      "انتقال سلس بين التخطيط اليومي والمتابعة الشهرية",
      "قيمة أفضل من شراء الأدوات منفصلة",
    ],
    whatYouGet: [
      "متتبع المهام",
      "متتبع الأهداف",
      "متتبع العادات",
      "لوحة رئيسية تجمع الصورة الكاملة",
      "تعليمات استخدام مختصرة بالعربية داخل الملف",
    ],
    requirements: ["حساب Google", "متصفح حديث", "لا يحتاج اشتراكاً شهرياً"],
    category: "bundle",
    featured: true,
    badge: "الأفضل قيمة",
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const featuredProduct: Product =
  products.find((p) => p.featured) ?? (products[0] as Product);

export const formatPrice = (value: number) =>
  `${CURRENCY}${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;

/** Discount percentage for a product with a compare-at price (rounded). */
export const savingsPercent = (p: Product) =>
  p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;

/** Verified trust points — every item is factual for a digital Google Sheets product. */
export const trustPoints = [
  { title: "وصول رقمي فوري", body: "الروابط تظهر لك بعد إتمام الدفع مباشرة." },
  { title: "يعمل داخل Google Sheets", body: "انسخ الملف إلى حسابك وابدأ — بلا تثبيت." },
  { title: "شراء مرة واحدة", body: "دفعة واحدة، بدون اشتراك شهري." },
  { title: "بسيط من أول يوم", body: "تعليمات مختصرة داخل الملف، بلا خبرة مسبقة." },
];

export interface ComparisonRow {
  label: string;
  values: Record<string, boolean>;
}

export const comparisonRows: ComparisonRow[] = [
  { label: "متابعة العادات", values: { "habit-tracker": true, "tasks-goals": false, "nazzim-complete": true } },
  { label: "إدارة المهام اليومية", values: { "habit-tracker": false, "tasks-goals": true, "nazzim-complete": true } },
  { label: "متابعة الأهداف", values: { "habit-tracker": false, "tasks-goals": true, "nazzim-complete": true } },
  { label: "لوحة رئيسية تجمع الصورة الكاملة", values: { "habit-tracker": true, "tasks-goals": true, "nazzim-complete": true } },
  { label: "يعمل داخل Google Sheets", values: { "habit-tracker": true, "tasks-goals": true, "nazzim-complete": true } },
  { label: "شراء مرة واحدة بدون اشتراك", values: { "habit-tracker": true, "tasks-goals": true, "nazzim-complete": true } },
];

/** Objection-handling FAQ. Only verified answers; placeholders are marked. */
export const faqs = [
  {
    q: "هل نظّم تطبيق أحمّله؟",
    a: "لا. أنظمة نظّم الحالية ملفات رقمية تعمل داخل Google Sheets، تفتحها من المتصفح بدون أي تثبيت.",
  },
  {
    q: "ماذا أحصل عليه بعد الدفع؟",
    a: "بعد إتمام الدفع يظهر لك رابط الملف مباشرة. تفتح الرابط، تختار «إنشاء نسخة» (Make a copy)، فتصبح لديك نسختك الخاصة وتبدأ الاستخدام.",
  },
  {
    q: "هل أحتاج خبرة في Google Sheets؟",
    a: "لا. كل ملف مصمم ليكون سهل الاستخدام، ويحتوي بداخله على تعليمات واضحة وخطوات مباشرة للبدء.",
  },
  {
    q: "هل أحتاج حساب Google؟",
    a: "نعم، تحتاج حساب Google مجاني لإنشاء نسختك الخاصة من الملف والاحتفاظ بتغييراتك.",
  },
  {
    q: "هل يعمل على الهاتف؟",
    a: "يمكن فتح الملف على الهاتف عبر تطبيق Google Sheets، لكن التجربة الأوسع تكون على شاشة الحاسب لأن الملفات تعرض جداول ورسوماً.",
  },
  {
    q: "هل يمكنني التعديل على الملف؟",
    a: "نعم. النسخة ملكك: يمكنك تعديل أسماء العادات والمهام والأقسام بما يناسب روتينك.",
  },
  {
    q: "هل أحتاج اشتراكاً شهرياً؟",
    a: "لا. الشراء لمرة واحدة، ولا توجد رسوم متكررة.",
  },
  {
    q: "ماذا لو دفعت ولم يعمل الملف؟",
    a: "تواصل معنا وسنحل المشكلة أو نرسل نسخة بديلة. وإذا تعذّر الحل، يُعاد إليك المبلغ بالكامل.",
  },
  {
    q: "هل يمكنني استخدامه لأكثر من شخص؟",
    a: "الترخيص لاستخدام شخصي واحد. للاستخدام داخل فريق أو مؤسسة، تواصل معنا لترتيب ذلك. (نص قابل للتعديل عند إقرار سياسة الترخيص النهائية)",
  },
  {
    q: "هل يوجد استرجاع؟",
    a: "المنتجات رقمية ويتم الوصول إليها فوراً. راجع صفحة سياسة الاسترجاع للتفاصيل، وهي قابلة للتحديث لتطابق سياسة المتجر النهائية.",
  },
];
