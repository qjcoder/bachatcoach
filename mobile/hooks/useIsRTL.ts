import { useTranslation } from 'react-i18next';
import { isRTLLanguage } from '@/lib/language';

/** Language-based RTL — only Urdu script. Roman Urdu uses LTR. */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return isRTLLanguage(i18n.language);
}
