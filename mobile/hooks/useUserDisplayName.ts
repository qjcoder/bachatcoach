import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getLocalizedName } from '@/lib/contact';

export function useUserDisplayName(fallback = ''): string {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  if (!user?.name) return fallback;
  return getLocalizedName(user, i18n.language) || fallback;
}
