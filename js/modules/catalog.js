/**
 * Pure Catalog Filtering & Sorting Core
 */
import { toPersianDigits } from './calculator.js';

export function filterCars(cars, { category = 'all', brand = 'all', query = '', sortBy = 'default' }) {
  if (!Array.isArray(cars)) return [];

  let result = [...cars];

  // 1. Filter Category
  if (category && category !== 'all') {
    result = result.filter(car => car.category === category);
  }

  // 2. Filter Brand
  if (brand && brand !== 'all') {
    result = result.filter(car => car.brand === brand);
  }

  // 3. Search Query
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    const faQ = toPersianDigits(q);
    result = result.filter(car => {
      const matchName = car.name && car.name.toLowerCase().includes(q);
      const matchBrand = car.brandName && car.brandName.toLowerCase().includes(q);
      const matchColor = car.color && car.color.toLowerCase().includes(q);
      const yearStr = String(car.year || '');
      const yearFaStr = toPersianDigits(yearStr);
      const matchYear = yearStr.includes(q) || yearFaStr.includes(q) || yearStr.includes(faQ) || yearFaStr.includes(faQ);
      const matchGearbox = car.specs && car.specs.gearbox && car.specs.gearbox.toLowerCase().includes(q);
      return matchName || matchBrand || matchColor || matchYear || matchGearbox;
    });
  }

  // 4. Sort
  if (sortBy === 'price-asc') {
    result.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price-desc') {
    result.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortBy === 'year-desc') {
    result.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (sortBy === 'mileage-asc') {
    result.sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
  }

  return result;
}
