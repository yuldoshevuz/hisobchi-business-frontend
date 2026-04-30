import type { FeatureCode } from '@/types/subscription.types';

interface FeatureI18n {
  name: string;
  description: string;
}

/**
 * User-facing Uzbek labels for the canonical feature catalog. The tenant UI
 * shows these on the Tariflar page and inside lock-screens. Codes outside
 * the map fall back to the raw code as a name.
 */
export const FEATURE_LABELS_UZ: Record<string, FeatureI18n> = {
  EMPLOYEES_LIMIT: {
    name: 'Xodimlar soni',
    description:
      "Tashkilotda jami xodimlar soni (egasi ham hisoblanadi). Yangi xodim taklif qilganda chegara tekshiriladi.",
  },
  ACCOUNT_LIMIT: {
    name: 'Hisoblar (kassalar) soni',
    description:
      "Bitta tashkilotdagi kassa, bank va e-hamyon hisoblari soni.",
  },
  ORGANIZATION_LIMIT: {
    name: 'Tashkilotlar soni',
    description:
      "Bir foydalanuvchi yarata oladigan tashkilotlar soni (egalik qiladigan).",
  },
  ADVANCED_REPORTS: {
    name: 'Kengaytirilgan hisobotlar',
    description:
      "Foyda-zarar (P&L) va Moliyaviy holat (balans) hisobotlari. Kassa hisoboti barcha tariflarda mavjud.",
  },
  MULTI_CURRENCY_SUPPORT: {
    name: "Ko'p valyutali ishlash",
    description:
      "Tashkilotning bazaviy valyutasidan tashqari valyutalarda hisob va tranzaksiyalar yuritish.",
  },
  DEBT_TRACKING: {
    name: 'Qarzlar hisoboti',
    description:
      "Mijoz va yetkazib beruvchilar bo'yicha qarzdorlik hisobotlari va per-kontakt balanslar. Qarz tranzaksiyalarini yaratish — barcha tariflarda mavjud.",
  },
  ADVANCED_TRANSACTIONS: {
    name: 'Murakkab tranzaksiyalar',
    description:
      "Balansni qo'lda to'g'irlash (sanoq farqi, shrinkage) va valyutalararo o'tkazma.",
  },
  SCHEDULED_TRANSACTIONS: {
    name: "Rejalashtirilgan to'lovlar",
    description:
      "Takrorlanadigan oylik/haftalik tranzaksiyalar va Telegram orqali avtomatik eslatmalar.",
  },
  INVENTORY_MANAGEMENT: {
    name: 'Ombor boshqaruvi',
    description:
      "Mahsulot qoldiqlarini kuzatish, ombor harakatlari va sanoq farqlarini hisobga olish.",
  },
  ADVANCED_RBAC: {
    name: 'Maxsus rollar',
    description:
      "Tashkilotda o'z rollaringizni yaratish va ularga ruxsatlar to'plamini biriktirish.",
  },
  SALES_COMMISSION: {
    name: 'Sotuv komissiyalari',
    description:
      'Sotuvlar uchun xodimlarga komissiya hisoblash, hisobot va bekor qilish.',
  },
};

export function getFeatureLabel(code: string): FeatureI18n {
  return FEATURE_LABELS_UZ[code] ?? { name: code, description: '' };
}

/**
 * Codes that gate broad UI sections — surfaced in the Tariflar page when
 * comparing what each plan unlocks. LIMIT codes are listed separately so
 * the UI can render them as "X dona" / "Cheksiz" instead of yes/no.
 */
export const BOOLEAN_FEATURE_CODES_UZ: ReadonlyArray<FeatureCode> = [
  'ADVANCED_REPORTS',
  'MULTI_CURRENCY_SUPPORT',
  'DEBT_TRACKING',
  'ADVANCED_TRANSACTIONS',
  'SCHEDULED_TRANSACTIONS',
  'INVENTORY_MANAGEMENT',
  'ADVANCED_RBAC',
  'SALES_COMMISSION',
];

export const LIMIT_FEATURE_CODES_UZ: ReadonlyArray<FeatureCode> = [
  'EMPLOYEES_LIMIT',
  'ACCOUNT_LIMIT',
  'ORGANIZATION_LIMIT',
];
