import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";

/**
 * react-i18next setup for the mini-app. uz is the canonical dictionary —
 * every key that appears here is callable from `useTranslation()`. ru/en
 * are peer dictionaries; missing keys silently fall back to uz so a
 * partial translation still ships a usable UI.
 *
 * The language is normally driven by the backend (`/users/me.locale`,
 * synced via `<I18nSync>` inside the providers tree). The detector is a
 * first-paint fallback while the `/me` query is still pending — it
 * reads `localStorage` so the user doesn't see a flash of uz when their
 * preference is ru or en.
 *
 * NOTE: We use a `const` object + derived union instead of a TS `enum`
 * because the project compiles under `erasableSyntaxOnly` (TS 5.5+),
 * which bans enums (they emit runtime code). The pattern below gives
 * the same call-site DX (`SUPPORTED_LOCALES.UZ`) plus a true union
 * type for prop signatures and exhaustive switches.
 */
export const SUPPORTED_LOCALES = {
  UZ: "uz",
  RU: "ru",
  EN: "en",
} as const;

export type Locale = (typeof SUPPORTED_LOCALES)[keyof typeof SUPPORTED_LOCALES];

export const SUPPORTED_LOCALES_LABEL: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

export const SUPPORTED_LOCALES_ARRAY: readonly Locale[] =
  Object.values(SUPPORTED_LOCALES);

export const DEFAULT_LOCALE: Locale = SUPPORTED_LOCALES.UZ;

const STORAGE_KEY = "hb_locale";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES_ARRAY],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

export function setLocale(locale: string | null | undefined): void {
  const next: Locale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  if (i18n.language === next) return;
  void i18n.changeLanguage(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // SSR / private mode — ignore.
  }
}

function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES_ARRAY as readonly string[]).includes(value)
  );
}

export default i18n;
