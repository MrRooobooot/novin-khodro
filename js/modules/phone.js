/**
 * Pure Iranian Phone Normalization and Validation
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  
  // Persian & Arabic digits map
  const charMap = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };

  let cleaned = rawPhone.replace(/[۰-۹٠-٩]/g, c => charMap[c] || c);
  cleaned = cleaned.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

export function isValidIranianMobile(phone) {
  const normalized = normalizePhone(phone);
  return /^09\d{9}$/.test(normalized);
}
