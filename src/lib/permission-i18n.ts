import { PermissionSlug } from './permission-slugs';

interface PermissionLabel {
  title: string;
  description: string;
}

export const PERMISSION_MODULE_LABEL: Record<string, string> = {
  organizations: 'Tashkilot',
  members: 'Xodimlar',
  roles: 'Rollar',
  accounts: 'Hisoblar',
  categories: 'Kategoriyalar',
  contacts: 'Kontaktlar',
  products: 'Mahsulotlar',
  transactions: 'Tranzaksiyalar',
  cash_flows: 'Pul oqimi',
  reports: 'Hisobotlar',
  scheduled: 'Rejalashtirilgan amallar',
  commissions: 'Komissiyalar',
  ai: 'AI',
  plans: 'Tariflar',
};

export const PERMISSION_LABEL: Record<string, PermissionLabel> = {
  [PermissionSlug.ORGANIZATIONS_MANAGE]: {
    title: 'Tashkilotni boshqarish',
    description: "Tashkilot nomi, tarif, til va asosiy valyutani o'zgartirish",
  },

  [PermissionSlug.MEMBERS_MANAGE]: {
    title: 'Xodimlarni boshqarish',
    description:
      "Xodimlarni taklif qilish, to'xtatib turish, arxivlash va rollarini belgilash",
  },

  [PermissionSlug.ROLES_MANAGE]: {
    title: 'Rollarni boshqarish',
    description: "Maxsus rollar yaratish, tahrirlash va o'chirish",
  },

  [PermissionSlug.ACCOUNTS_MANAGE]: {
    title: 'Hisoblarni boshqarish',
    description: 'Hisoblar yaratish, tahrirlash va arxivlash',
  },
  [PermissionSlug.ACCOUNTS_READ]: {
    title: "Hisoblarni ko'rish",
    description: "Hisoblar va qoldiqlarni ko'rish",
  },

  [PermissionSlug.CATEGORIES_MANAGE]: {
    title: 'Kategoriyalarni boshqarish',
    description: 'Tashkilot kategoriyalarini boshqarish',
  },

  [PermissionSlug.CONTACTS_MANAGE]: {
    title: 'Kontaktlarni boshqarish',
    description: 'Kontakt yaratish, tahrirlash va arxivlash',
  },
  [PermissionSlug.CONTACTS_READ]: {
    title: "Kontaktlarni ko'rish",
    description: "Kontaktlar va ularning tarixini ko'rish",
  },

  [PermissionSlug.PRODUCTS_MANAGE]: {
    title: 'Mahsulotlarni boshqarish',
    description: 'Mahsulot yaratish, tahrirlash va arxivlash',
  },
  [PermissionSlug.PRODUCTS_READ]: {
    title: "Mahsulotlarni ko'rish",
    description: "Mahsulot katalogini ko'rish",
  },

  [PermissionSlug.TRANSACTIONS_CREATE]: {
    title: 'Tranzaksiya yaratish',
    description: "Sotuv, xarajat, o'tkazma va boshqa tranzaksiyalarni yozish",
  },
  [PermissionSlug.TRANSACTIONS_UPDATE]: {
    title: 'Tranzaksiyani tahrirlash',
    description:
      "Mavjud tranzaksiya maydonlarini o'zgartirish va AI takliflarini tasdiqlash",
  },
  [PermissionSlug.TRANSACTIONS_VOID]: {
    title: 'Tranzaksiyani bekor qilish',
    description: 'Mavjud tranzaksiyani bekor qilish',
  },
  [PermissionSlug.TRANSACTIONS_READ]: {
    title: "Tranzaksiyalarni ko'rish",
    description: "Tranzaksiyalar va ularning tafsilotlarini ko'rish",
  },

  [PermissionSlug.CASH_FLOWS_CREATE]: {
    title: "To'lov qo'shish",
    description: 'Tranzaksiyaga tushum yoki chiqim yozish',
  },
  [PermissionSlug.CASH_FLOWS_READ]: {
    title: "Pul oqimini ko'rish",
    description: "Pul oqimi tarixini ko'rish",
  },

  [PermissionSlug.REPORTS_READ]: {
    title: "Hisobotlarni ko'rish",
    description:
      "Moliyaviy hisobotlar: pul oqimi, foyda/zarar, moliyaviy holat",
  },

  [PermissionSlug.SCHEDULED_MANAGE]: {
    title: 'Rejalashtirilgan amallarni boshqarish',
    description: 'Takrorlanuvchi tranzaksiya va eslatmalarni boshqarish',
  },
  [PermissionSlug.SCHEDULED_READ]: {
    title: "Rejalashtirilgan amallarni ko'rish",
    description: "Takrorlanuvchi tranzaksiya va eslatmalarni ko'rish",
  },

  [PermissionSlug.COMMISSIONS_READ]: {
    title: "Komissiyalarni ko'rish",
    description: "Topilgan komissiyalarni ko'rish",
  },
  [PermissionSlug.COMMISSIONS_MANAGE]: {
    title: 'Komissiyalarni boshqarish',
    description: 'Sotuvlardagi komissiyalarni yozish va bekor qilish',
  },

  [PermissionSlug.AI_MANAGE]: {
    title: 'AI imkoniyatlari',
    description:
      "AI orqali ma'lumot kiritish va AI takliflarini ko'rib chiqish",
  },

  [PermissionSlug.PLANS_MANAGE]: {
    title: 'Tariflarni boshqarish',
    description: 'Platforma tariflarini boshqarish (faqat platforma admini)',
  },
};

export function getPermissionModuleLabel(module: string): string {
  return PERMISSION_MODULE_LABEL[module] ?? module;
}

export function getPermissionLabel(slug: string): PermissionLabel {
  return PERMISSION_LABEL[slug] ?? { title: slug, description: '' };
}
