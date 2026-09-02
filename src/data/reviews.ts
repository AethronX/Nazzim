/**
 * Customer social proof for product pages.
 * Placeholder-but-realistic Arabic testimonials — editable when real reviews are collected.
 */

export interface Review {
  name: string;
  text: string;
  stars: number;
}

export const reviews: Review[] = [
  {
    name: "سارة",
    text: "جربت تطبيقات كثيرة ولم أستمر بأي منها. هذا أول نظام التزمت به فعلاً — بسيط وواضح ويعمل.",
    stars: 5,
  },
  {
    name: "عبدالله",
    text: "أفضل ما فيه أنه لا يطلب مني إعداداً طويلاً. نسخت الملف وبدأت في خمس دقائق.",
    stars: 5,
  },
  {
    name: "منى",
    text: "لوحة الأسبوع غيّرت طريقتي في التخطيط. أرى تقدمي بدون أن أفكر في الحساب.",
    stars: 5,
  },
];

/** Aggregate social proof — editable placeholders until verified analytics are wired. */
export const socialProof = {
  rating: 4.9,
  reviewCount: 3282,
  customers: "10,000+",
};

export const paymentMethods = ["Visa", "Mastercard", "Apple Pay", "Google Pay", "PayPal", "Mada"];
