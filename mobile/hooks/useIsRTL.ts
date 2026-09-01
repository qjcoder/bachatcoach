import { useTranslation } from 'react-i18next';
import { isRTLLanguage } from '@/lib/rtl';

/** Language-based RTL — works immediately without waiting for I18nManager reload. */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return isRTLLanguage(i18n.language);
}
