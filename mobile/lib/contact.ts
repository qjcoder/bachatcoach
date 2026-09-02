import { normalizeLanguage } from '@/lib/language';

type NamedEntity = {
  name: string;
  nameUr?: string;
};

export function getLocalizedName(entity: NamedEntity, lang?: string) {
  return normalizeLanguage(lang) === 'ur' && entity.nameUr ? entity.nameUr : entity.name;
}

export function getContactName(contact: NamedEntity, lang?: string) {
  return getLocalizedName(contact, lang);
}
