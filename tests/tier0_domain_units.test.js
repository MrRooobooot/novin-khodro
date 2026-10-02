/**
 * Unit Tests for Pure Domain Modules (Calculator, Phone Normalizer, Catalog Engine)
 */
const path = require('path');
const { describe, test, assert } = require('./helpers/test_runner.js');
const oracles = require('./helpers/reference_oracles.js');

describe('Tier 0: Domain Unit Tests (Pure Modules)', () => {
  let calcModule;
  let phoneModule;
  let catalogModule;

  test('T0-0: Dynamic Import of Pure ES Domain Modules', async () => {
    calcModule = await import('../js/modules/calculator.js');
    phoneModule = await import('../js/modules/phone.js');
    catalogModule = await import('../js/modules/catalog.js');
    assert.ok(calcModule, 'Calculator module loaded');
    assert.ok(phoneModule, 'Phone module loaded');
    assert.ok(catalogModule, 'Catalog module loaded');
  });

  describe('Calculator Domain Math', () => {
    test('T0-1: toPersianDigits converts English digits accurately', () => {
      assert.strictEqual(calcModule.toPersianDigits(1234567890), '۱۲۳۴۵۶۷۸۹۰');
      assert.strictEqual(calcModule.toPersianDigits('Price: 500'), 'Price: ۵۰۰');
      assert.strictEqual(calcModule.toPersianDigits(null), '');
    });

    test('T0-2: formatPrice formats with thousands commas and Persian digits', () => {
      assert.strictEqual(calcModule.formatPrice(1000000), '۱,۰۰۰,۰۰۰');
      assert.strictEqual(calcModule.formatPrice(4350), '۴,۳۵۰');
      assert.strictEqual(calcModule.formatPrice(0), '۰');
    });

    test('T0-3: calculateInstallment accurately computes 3.5% monthly profit formula', () => {
      const res = calcModule.calculateInstallment(1000, 50, 12);
      assert.strictEqual(res.price, 1000);
      assert.strictEqual(res.downPayment, 500);
      assert.strictEqual(res.loanAmount, 500);
      assert.strictEqual(res.totalProfit, 210);
      assert.strictEqual(res.totalLoanRepayment, 710);
      assert.strictEqual(res.monthlyInstallment, 59);
      assert.strictEqual(res.totalPayback, 1210);
    });

    test('T0-4: calculateInstallment handles negative and zero inputs safely', () => {
      const safe = calcModule.calculateInstallment(-500, -10, 0);
      assert.ok(safe.price >= 0);
      assert.ok(safe.monthlyInstallment >= 0);
      assert.strictEqual(safe.tenureMonths, 12); // Zero defaults to safe 12-month tenure
    });

    test('T0-4b: evaluateMarketPrice computes Tehran paint, chassis, insurance & mileage deductions accurately', () => {
      assert.ok(typeof calcModule.evaluateMarketPrice === 'function');
      // Case 1: Spotless, intact, 12m insurance, 0 excess mileage
      const spotless = calcModule.evaluateMarketPrice(1000, {
        paint: 'spotless',
        chassis: 'intact',
        insuranceMonths: 12
      });
      assert.strictEqual(spotless.adjustedPriceMillion, 1000);
      assert.strictEqual(spotless.totalDeductionPct, 0);

      // Case 2: One part paint (-4%), minor front chassis (-8%), 2 months insurance remaining (-1.2%), 20000 km excess (-1%)
      const damaged = calcModule.evaluateMarketPrice(1000, {
        paint: 'one_part',
        chassis: 'minor_front',
        insuranceMonths: 2,
        excessMileageKm: 20000
      });
      const oracle = oracles.evaluateMarketPriceOracle(1000, {
        paint: 'one_part',
        chassis: 'minor_front',
        insuranceMonths: 2,
        excessMileageKm: 20000
      });
      assert.strictEqual(damaged.adjustedPriceMillion, oracle.adjustedPriceMillion);
      assert.strictEqual(damaged.totalDeductionPct, oracle.totalDeductionPct);
      assert.strictEqual(damaged.adjustedPriceMillion, 858); // 1000 * (1 - 0.142) = 858M
    });
  });

  describe('Phone Domain Normalization', () => {
    test('T0-5: normalizePhone strips formatting and maps Persian/Arabic prefixes', () => {
      assert.strictEqual(phoneModule.normalizePhone('+989121234567'), '09121234567');
      assert.strictEqual(phoneModule.normalizePhone('00989121234567'), '09121234567');
      assert.strictEqual(phoneModule.normalizePhone('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
      assert.strictEqual(phoneModule.normalizePhone('0912-345-6789'), '09123456789');
    });

    test('T0-6: isValidIranianMobile validates 11-digit Iranian mobile numbers', () => {
      assert.strictEqual(phoneModule.isValidIranianMobile('09121234567'), true);
      assert.strictEqual(phoneModule.isValidIranianMobile('+989121234567'), true);
      assert.strictEqual(phoneModule.isValidIranianMobile('۰۹۱۲۳۴۵۶۷۸۹'), true);
      assert.strictEqual(phoneModule.isValidIranianMobile('08121234567'), false);
      assert.strictEqual(phoneModule.isValidIranianMobile('0912'), false);
      assert.strictEqual(phoneModule.isValidIranianMobile('091234567890'), false);
    });
  });

  describe('Catalog Pure Filter & Sorting', () => {
    const mockCars = [
      { id: 1, name: 'اکستریم VX', category: 'chinese', brand: 'chery', brandName: 'مدیران خودرو', price: 4350, year: 1403, mileage: 0, specs: { gearbox: 'اتوماتیک' } },
      { id: 2, name: 'هیوندای i20', category: 'used', brand: 'hyundai', brandName: 'کرمان موتور', price: 1380, year: 1397, mileage: 62000, color: 'قرمز', specs: { gearbox: 'اتوماتیک' } },
      { id: 3, name: 'پژو 207i', category: 'zero', brand: 'ikco', brandName: 'ایران خودرو', price: 780, year: 1403, mileage: 0, specs: { gearbox: 'دستی' } },
    ];

    test('T0-7: filterCars filters by vehicle category', () => {
      const res = catalogModule.filterCars(mockCars, { category: 'chinese' });
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].name, 'اکستریم VX');
    });

    test('T0-8: filterCars matches Persian digits and transmission specs in search', () => {
      const resYear = catalogModule.filterCars(mockCars, { query: '۱۳۹۷' });
      assert.strictEqual(resYear.length, 1);
      assert.strictEqual(resYear[0].name, 'هیوندای i20');

      const resGear = catalogModule.filterCars(mockCars, { query: 'دستی' });
      assert.strictEqual(resGear.length, 1);
      assert.strictEqual(resGear[0].name, 'پژو 207i');
    });

    test('T0-9: filterCars sorts by price ascending and descending', () => {
      const asc = catalogModule.filterCars(mockCars, { sortBy: 'price-asc' });
      assert.strictEqual(asc[0].price, 780);
      assert.strictEqual(asc[2].price, 4350);

      const desc = catalogModule.filterCars(mockCars, { sortBy: 'price-desc' });
      assert.strictEqual(desc[0].price, 4350);
      assert.strictEqual(desc[2].price, 780);
    });
  });
});
