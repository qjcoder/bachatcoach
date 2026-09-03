/** Digits-only key so 0300-1234567 and 03001234567 match. */
export function phoneKey(phone?: string | null) {
  return String(phone || '').replace(/\D/g, '');
}

export function contactMatchesQuery(
  contact: { name?: string; nameUr?: string; phone?: string },
  query: string
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = phoneKey(q);
  const name = `${contact.name || ''} ${contact.nameUr || ''}`.toLowerCase();
  if (name.includes(q)) return true;
  if (digits && phoneKey(contact.phone).includes(digits)) return true;
  return (contact.phone || '').toLowerCase().includes(q);
}
