/**
 * Pure Domain Math & Financing Utilities for Novin Khodro
 */
export const FINANCING_CONSTANTS = {
  MONTHLY_PROFIT_RATE: 0.035, // 3.5% per month
  MIN_PRICE: 300,             // 300 Million Tomans
  MAX_PRICE: 12000,           // 12000 Million Tomans
  DEFAULT_PRICE: 1000,
  MIN_DOWN_PCT: 40,
  MAX_DOWN_PCT: 70,
  DEFAULT_DOWN_PCT: 50,
  ALLOWED_TENURES: [6, 12, 18, 24],
  DEFAULT_TENURE: 12,
};

/**
 * Iranian Tehran Market Valuation Factors & Multipliers
 * Standards based on official Iranian expert appraisal guidelines:
 * - Body paint condition (رنگ‌شدگی، لیسه‌گیری، تعویض، تمام‌رنگ)
 * - Chassis status (شاسی ضربه‌دیده، جوش، پلمپ)
 * - Third-party insurance validity (بیمه شخص ثالث)
 * - Mileage vs typical Tehran annual usage (~18,000 - 20,000 km/yr)
 * - Document clearance status (سند تک‌برگ، وکالتی، آماده انتقال)
 */
export const MARKET_VALUATION_FACTORS = {
  // Paint condition deduction percentages relative to zero-color flawless baseline
  PAINT: {
    spotless: 0.0,       // بدون رنگ و خط و خش
    one_part: 0.04,      // یک لکه رنگ
    two_parts: 0.08,     // دو لکه رنگ
    multi_parts: 0.13,   // چند لکه رنگ
    paint_full: 0.25,    // تمام رنگ / دور رنگ
    scratch_dent: 0.02,  // خط و خش یا لیسه‌گیری جزئی
  },
  // Chassis structural damage deductions (heavy penalty in Tehran market)
  CHASSIS: {
    intact: 0.0,         // سالم و پلمپ کارخانه
    minor_front: 0.08,   // خوردگی یا ضربه ترافیکی جزئی جلو
    minor_rear: 0.05,    // خوردگی یا ضربه ترافیکی جزئی عقب
    repaired: 0.18,      // شاسی جوش یا کشیده شده
  },
  // Insurance impact (short insurance requires immediate renewal outlay ~10-18M Toman)
  INSURANCE: {
    FULL_12_MONTHS: 0.0,
    MONTH_PENALTY_RATE: 0.003, // ~0.3% penalty per missing month below 6 months
  },
  // Document status
  DOCUMENT: {
    first_owner_ready: 0.0,  // سند تک‌برگ آماده انتقال
    attorney_proxy: 0.02,    // وکالت تعویض پلاک
  }
};

/**
 * Calculate empirical Tehran market valuation based on vehicle condition
 * @param {number} basePriceMillion - Market spot price for zero/flawless condition
 * @param {object} factors - Vehicle inspection metrics
 */
export function evaluateMarketPrice(basePriceMillion, factors = {}) {
  const base = Number.isFinite(Number(basePriceMillion)) ? Number(basePriceMillion) : FINANCING_CONSTANTS.DEFAULT_PRICE;
  const paintCondition = factors.paint || 'spotless';
  const chassisCondition = factors.chassis || 'intact';
  const insuranceMonths = Number.isFinite(Number(factors.insuranceMonths)) ? Number(factors.insuranceMonths) : 12;
  const documentStatus = factors.document || 'first_owner_ready';
  const excessMileage = Number.isFinite(Number(factors.excessMileageKm)) ? Math.max(0, Number(factors.excessMileageKm)) : 0;

  const paintDeductionPct = MARKET_VALUATION_FACTORS.PAINT[paintCondition] || 0.0;
  const chassisDeductionPct = MARKET_VALUATION_FACTORS.CHASSIS[chassisCondition] || 0.0;
  const documentDeductionPct = MARKET_VALUATION_FACTORS.DOCUMENT[documentStatus] || 0.0;

  // Missing insurance deduction (if < 6 months remaining)
  const missingInsuranceMonths = Math.max(0, 6 - insuranceMonths);
  const insuranceDeductionPct = missingInsuranceMonths * MARKET_VALUATION_FACTORS.INSURANCE.MONTH_PENALTY_RATE;

  // Mileage depreciation: ~0.5% per 10,000 km excess over expected
  const mileageDeductionPct = (excessMileage / 10000) * 0.005;

  const totalDeductionPct = Math.min(0.65, paintDeductionPct + chassisDeductionPct + documentDeductionPct + insuranceDeductionPct + mileageDeductionPct);
  const adjustedPriceMillion = Math.round(base * (1 - totalDeductionPct));

  return {
    basePriceMillion: base,
    adjustedPriceMillion,
    totalDeductionPct: Math.round(totalDeductionPct * 1000) / 10, // e.g. 8.5%
    deductions: {
      paint: paintDeductionPct,
      chassis: chassisDeductionPct,
      document: documentDeductionPct,
      insurance: insuranceDeductionPct,
      mileage: mileageDeductionPct
    }
  };
}

/**
 * Convert English digits to Persian
 */
export function toPersianDigits(num) {
  if (num === null || num === undefined) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, w => persianDigits[+w]);
}

/**
 * Format number with comma separators and Persian digits
 */
export function formatPrice(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '۰';
  const parts = Math.round(Number(num)).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toPersianDigits(parts.join('.'));
}

/**
 * Calculate loan installments, profit, and total payback
 */
export function calculateInstallment(totalPriceMillion, downPercent, tenureMonths) {
  const price = Number.isFinite(Number(totalPriceMillion)) ? Number(totalPriceMillion) : FINANCING_CONSTANTS.DEFAULT_PRICE;
  const downPct = Number.isFinite(Number(downPercent)) ? Number(downPercent) : FINANCING_CONSTANTS.DEFAULT_DOWN_PCT;
  const rawTenure = Number(tenureMonths);
  const months = Number.isFinite(rawTenure) && rawTenure > 0 ? Math.round(rawTenure) : FINANCING_CONSTANTS.DEFAULT_TENURE;

  const sanitizedPrice = Math.max(0, price);
  const sanitizedDownPct = Math.max(0, Math.min(100, downPct));
  const sanitizedMonths = Math.max(1, months);

  const downPayment = Math.round(sanitizedPrice * (sanitizedDownPct / 100));
  const loanAmount = Math.max(0, sanitizedPrice - downPayment);
  const totalProfit = Math.round(loanAmount * FINANCING_CONSTANTS.MONTHLY_PROFIT_RATE * sanitizedMonths);
  const totalLoanRepayment = loanAmount + totalProfit;
  const monthlyInstallment = sanitizedMonths > 0 ? Math.round(totalLoanRepayment / sanitizedMonths) : 0;
  const totalPayback = downPayment + totalLoanRepayment;

  return {
    price: sanitizedPrice,
    downPercent: sanitizedDownPct,
    tenureMonths: sanitizedMonths,
    downPayment,
    loanAmount,
    totalProfit,
    totalLoanRepayment,
    monthlyInstallment,
    totalPayback,
  };
}
