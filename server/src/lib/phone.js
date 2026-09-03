/** Digits-only key so 0300-1234567 and 03001234567 match. */
export function phoneKey(phone) {
  return String(phone || '').replace(/\D/g, '');
}
