import { db } from "@api/lib/db";

/** JSON key/value settings (Setting table). Unknown or corrupt values fall back to `fallback`. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  const json = JSON.stringify(value);
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

export type OrganizationProfile = {
  name?: string;
  fullName?: string;
  fullNameAr?: string;
  email?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  foundedYear?: number;
};

export type BankDetails = { bank?: string; rib?: string; iban?: string; holder?: string };
