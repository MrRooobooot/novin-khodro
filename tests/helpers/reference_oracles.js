/**
 * Novin Khodro — Authoritative Reference Oracles & Mathematical Models
 * Provides ground-truth expected output derivation for financial formulas,
 * Persian localization, Iranian phone validation, and inventory algorithms.
 */

/**
 * Persian & Arabic Digits Normalization
 */
function toPersianDigitsOracle(val) {
  if (val === null || val === undefined) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return val.toString().replace(/\d/g, x => farsiDigits[parseInt(x, 10)]);
}

function toAsciiDigitsOracle(val) {
  if (val === null || val === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let str = val.toString();
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(persianDigits[i], i.toString());
    str = str.replaceAll(arabicDigits[i], i.toString());
  }
  return str;
}

function formatNumberFaOracle(num) {
  if (num === null || num === undefined || !Number.isFinite(Number(num))) return '۰';
  const rounded = Math.round(Number(num));
  const parts = Math.abs(rounded).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = rounded < 0 ? '-' : '';
  return sign + toPersianDigitsOracle(parts.join('.'));
}

function formatTomansOracle(num) {
  return `${formatNumberFaOracle(num)} تومان`;
}

/**
 * Financial Installment Calculator Oracle
 * Formula:
 * - CarPrice = PriceMillion * 1,000,000
 * - DownPayment = round(CarPrice * (Percent / 100))
 * - LoanPrincipal = CarPrice - DownPayment
 * - MonthlyRate = 0.035 (3.5% monthly)
 * - TotalInterest = LoanPrincipal * MonthlyRate * TenureMonths
 * - TotalPayback = LoanPrincipal + TotalInterest
 * - MonthlyInstallment = round(TotalPayback / TenureMonths)
 */
function calculateInstallmentsOracle(priceMillionInput, downPercentInput, tenureMonthsInput) {
  const priceMillion = Number.isFinite(Number(priceMillionInput)) ? Number(priceMillionInput) : 1000;
  const downPercent = Number.isFinite(Number(downPercentInput)) ? Number(downPercentInput) : 50;
  const rawTenure = Number(tenureMonthsInput);
  const tenureMonths = Number.isFinite(rawTenure) && rawTenure > 0 ? Math.round(rawTenure) : 12;

  // Safe clamping
  const sanitizedPriceMillion = Math.max(0, priceMillion);
  const sanitizedDownPercent = Math.max(0, Math.min(100, downPercent));
  const sanitizedTenure = Math.max(1, tenureMonths);

  const carPrice = sanitizedPriceMillion * 1000000;
  const downPaymentVal = Math.round(carPrice * (sanitizedDownPercent / 100));
  const loanAmountVal = Math.max(0, carPrice - downPaymentVal);

  const monthlyRate = 0.035;
  const totalInterest = loanAmountVal * monthlyRate * sanitizedTenure;
  const totalPayback = loanAmountVal + totalInterest;
  const monthlyPayment = Math.round(totalPayback / sanitizedTenure);

  return {
    priceMillion: sanitizedPriceMillion,
    downPercent: sanitizedDownPercent,
    tenureMonths: sanitizedTenure,
    carPrice,
    downPaymentVal,
    loanAmountVal,
    totalInterest,
    totalPayback,
    monthlyPayment,
    formattedCarPrice: formatTomansOracle(carPrice),
    formattedDownPayment: formatTomansOracle(downPaymentVal),
    formattedLoanAmount: formatTomansOracle(loanAmountVal),
    formattedMonthlyPayment: `${formatNumberFaOracle(monthlyPayment)} تومان / ماه`,
  };
}

/**
 * Iranian Mobile Phone Validation Oracle
 * Accepts standard formats:
 * - 09121234567
 * - +989121234567
 * - 00989121234567
 * - 989121234567
 * - 9121234567
 * - Persian numerals: ۰۹۱۲۳۴۵۶۷۸۹
 */
function validateIranianPhoneOracle(phoneInput) {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return { isValid: false, normalized: '', reason: 'شماره تلفن خالی است' };
  }

  // Normalize Persian/Arabic digits to ASCII
  let normalized = toAsciiDigitsOracle(phoneInput).trim();
  // Strip whitespace, hyphens, parentheses
  normalized = normalized.replace(/[\s\-()]/g, '');

  const iranianMobileRegex = /^(?:(?:\+98|0098|98|0)?9\d{9})$/;
  const isValid = iranianMobileRegex.test(normalized);

  let standard09Format = '';
  if (isValid) {
    const match = normalized.match(/9\d{9}$/);
    if (match) {
      standard09Format = '0' + match[0];
    }
  }

  return {
    isValid,
    normalized: standard09Format || normalized,
    reason: isValid ? 'معتبر' : 'فرمت شماره موبایل نامعتبر است (باید با ۰۹ شروع شود و ۱۱ رقم باشد)',
  };
}

/**
 * Catalog Filter & Sort Oracle
 */
function filterAndSortCarsOracle(carsList, { category = 'all', brand = 'all', sort = 'featured', query = '' } = {}) {
  let result = [...carsList];

  // Category filter
  if (category && category !== 'all') {
    if (category === 'zero') {
      result = result.filter(c => c.isZero === true);
    } else if (category === 'used') {
      result = result.filter(c => c.isZero === false);
    } else {
      result = result.filter(c => c.category === category);
    }
  }

  // Brand filter
  if (brand && brand !== 'all') {
    result = result.filter(c => c.brand === brand);
  }

  // Search query filter (matches title, year, bodyStatus, color)
  if (query && query.trim() !== '') {
    const cleanQ = toAsciiDigitsOracle(query.trim().toLowerCase());
    result = result.filter(c => {
      const title = toAsciiDigitsOracle((c.title || '').toLowerCase());
      const modelYear = toAsciiDigitsOracle((c.modelYear || '').toLowerCase());
      const bodyStatus = toAsciiDigitsOracle((c.bodyStatus || '').toLowerCase());
      const color = toAsciiDigitsOracle((c.color || '').toLowerCase());
      return title.includes(cleanQ) || modelYear.includes(cleanQ) || bodyStatus.includes(cleanQ) || color.includes(cleanQ);
    });
  }

  // Sorting
  result.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return (a.price || 0) - (b.price || 0);
      case 'price-desc':
        return (b.price || 0) - (a.price || 0);
      case 'mileage-asc':
        return (a.mileage || 0) - (b.mileage || 0);
      case 'year-desc': {
        const yearA = parseInt(toAsciiDigitsOracle(a.modelYear || '0'), 10);
        const yearB = parseInt(toAsciiDigitsOracle(b.modelYear || '0'), 10);
        return yearB - yearA;
      }
      case 'featured':
      default:
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    }
  });

  return result;
}

function evaluateMarketPriceOracle(basePriceMillion, factors = {}) {
  const base = Number.isFinite(Number(basePriceMillion)) ? Number(basePriceMillion) : 1000;
  const paint = factors.paint || 'spotless';
  const chassis = factors.chassis || 'intact';
  const insuranceMonths = Number.isFinite(Number(factors.insuranceMonths)) ? Number(factors.insuranceMonths) : 12;
  const documentStatus = factors.document || 'first_owner_ready';
  const excessMileage = Number.isFinite(Number(factors.excessMileageKm)) ? Math.max(0, Number(factors.excessMileageKm)) : 0;

  const paintDeductions = {
    spotless: 0.0,
    one_part: 0.04,
    two_parts: 0.08,
    multi_parts: 0.13,
    paint_full: 0.25,
    scratch_dent: 0.02,
  };

  const chassisDeductions = {
    intact: 0.0,
    minor_front: 0.08,
    minor_rear: 0.05,
    repaired: 0.18,
  };

  const docDeductions = {
    first_owner_ready: 0.0,
    attorney_proxy: 0.02,
  };

  const pD = paintDeductions[paint] || 0.0;
  const cD = chassisDeductions[chassis] || 0.0;
  const dD = docDeductions[documentStatus] || 0.0;
  const iD = Math.max(0, 6 - insuranceMonths) * 0.003;
  const mD = (excessMileage / 10000) * 0.005;

  const totalDeductionPct = Math.min(0.65, pD + cD + dD + iD + mD);
  const adjustedPriceMillion = Math.round(base * (1 - totalDeductionPct));

  return {
    basePriceMillion: base,
    adjustedPriceMillion,
    totalDeductionPct: Math.round(totalDeductionPct * 1000) / 10,
    deductions: {
      paint: pD,
      chassis: cD,
      document: dD,
      insurance: iD,
      mileage: mD
    }
  };
}

module.exports = {
  toPersianDigitsOracle,
  toAsciiDigitsOracle,
  formatNumberFaOracle,
  formatTomansOracle,
  calculateInstallmentsOracle,
  validateIranianPhoneOracle,
  filterAndSortCarsOracle,
  evaluateMarketPriceOracle,
};
