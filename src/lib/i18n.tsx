import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { dictionary } from "./dict";

export type Lang = "ar" | "en";

export const LANG_STORAGE_KEY = "nazzim.lang";

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** Translate an Arabic source string. Falls back to the Arabic text. */
  t: (ar: string) => string;
}

const FALLBACK: I18nValue = {
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  toggleLang: () => {},
  t: (ar) => ar,
};

/** Singleton context so HMR never produces two providers. */
const g = globalThis as typeof globalThis & {
  __nazzimI18nContext?: React.Context<I18nValue>;
};
const I18nContext = (g.__nazzimI18nContext ??= createContext<I18nValue>(FALLBACK));

/** Translate outside React (e.g. head() metadata) using an explicit lang. */
export function translate(ar: string, lang: Lang) {
  if (lang === "ar") return ar;
  return dictionary[ar] ?? ar;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "ar") setLangState(stored);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    html.setAttribute("data-lang", lang);
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const setLang = (next: Lang) => {
      setLangState(next);
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    };
    return {
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggleLang: () => setLang(lang === "ar" ? "en" : "ar"),
      t: (ar: string) => translate(ar, lang),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Shorthand: const t = useT(). */
export function useT() {
  return useI18n().t;
}
