/**
 * بانک اطلاعاتی خودروهای موجود در نمایشگاه نوین خودرو
 * تولیدشده توسط پنل لوکال — source of truth: .hermes/admin/inventory.json
 *
 * - قیمت‌ها: تومان. priceFormatted با ارقام فارسی و جداکننده «٬».
 * - brand: کلید فیلتر (chery/hyundai/ikco/saipa). category: chinese/imported/iranian.
 * - isZero: خودروی صفر کیلومتر.
 */

const carsData = [
  {
    "id": 1,
    "title": "اکستریم VX شاسی بلند (Xtrim)",
    "brand": "chery",
    "category": "chinese",
    "modelYear": "۱۴۰۳",
    "mileage": 0,
    "mileageText": "صفر کیلومتر خشک",
    "isZero": true,
    "price": 11450000000,
    "priceFormatted": "۱۱،۴۵۰،۰۰۰،۰۰۰ تومان",
    "priceMillion": 11450,
    "color": "مشکی متالیک متالایز",
    "interiorColor": "چرم اختصاصی با تریم چوب طبیعی (رنگ دقیق: نامشخص)",
    "gearbox": "۷ سرعته اتوماتیک دو-کلاچه (DCT)",
    "fuel": "بنزین توربو GDI",
    "engine": "۱.۶ لیتری TGDI با ۱۹۷ اسب بخار و گشتاور ۲۹۰ نیوتن‌متر (دیفرانسیل جلو FWD)",
    "bodyStatus": "بدون رنگ و خط و خش (صفر خشک)",
    "chassisStatus": "شاسی جلو و عقب سالم و پلمپ کارخانه",
    "inspectionSummary": "کارشناسی شده رسمی ۱۰۰٪ معتبر با ضمانت کتبی",
    "insuranceMonths": 12,
    "insuranceText": "۱۲ ماه بیمه شخص ثالث کامل",
    "warranty": "۷ سال یا ۲۰۰,۰۰۰ کیلومتر گارانتی فعال مدیران خودرو",
    "documentStatus": "سند تک‌برگ شرکتی آماده انتقال قطعی",
    "image": "images/cars/xtrim-vx-v2.webp",
    "gallery": [
      "images/cars/xtrim-vx-v2.webp"
    ],
    "features": [
      "سیستم کمکی راننده سطح ۲.۵ (ADAS) با کروز کنترل تطبیقی هوشمند",
      "حالت‌های رانندگی انتخابی با کنترل الکترونیکی پایداری (ESC) و دیفرانسیل جلو",
      "نمایشگر ۱۵.۶ اینچی و جلوآمپر دیجیتال ۱۲.۳ اینچی",
      "گرمکن و سردکن صندلی‌های جلو به همراه ماساژور",
      "سیستم صوتی حرفه‌ای سونی",
      "سقف پانورامای برقی و هدآپ دیسپلی (HUD)"
    ],
    "badges": [
      {
        "text": "کارشناسی شده",
        "type": "verified"
      },
      {
        "text": "صفر کیلومتر",
        "type": "zero"
      },
      {
        "text": "۱۲ ماه بیمه",
        "type": "insurance"
      }
    ],
    "badge": "لوکس‌ترین شاسی‌بلند",
    "isFeatured": true,
    "description": "لوکس‌ترین شاسی بلند صفر کیلومتر موجود در بازار ایران، تحویل روز مدیران خودرو، گارانتی ۷ ساله فعال شرکتی، آماده انتقال سند قطعی به همراه برگه رسمی کارشناسی سلامت نوین خودرو."
  },
  {
    "id": 2,
    "title": "پژو ۲۰۷i دنده‌ای پانوراما",
    "brand": "ikco",
    "category": "iranian",
    "modelYear": "۱۴۰۳",
    "mileage": 0,
    "mileageText": "صفر کیلومتر تحویل روز",
    "isZero": true,
    "price": 2350000000,
    "priceFormatted": "۲،۳۵۰،۰۰۰،۰۰۰ تومان",
    "priceMillion": 2350,
    "color": "سفید دوپوششه روغنی",
    "interiorColor": "مشکی فابریک",
    "gearbox": "۵ سرعته دستی",
    "fuel": "بنزین",
    "engine": "TU5 با ۱۰۵ اسب بخار",
    "bodyStatus": "بدون رنگ، بدون لیسه‌گیری، صفر کارخانه",
    "chassisStatus": "شاسی‌های جلو و عقب کاملاً سالم و پلمپ",
    "inspectionSummary": "کارشناسی رسمی تایید شده نوین خودرو",
    "insuranceMonths": 12,
    "insuranceText": "۱۲ ماه بیمه شخص ثالث کامل کارخانه",
    "warranty": "۳ سال گارانتی رسمی فعال ایران خودرو",
    "documentStatus": "سند و مدارک آزاد و آماده انتقال آنی",
    "image": "images/cars/peugeot-207.webp",
    "gallery": [
      "images/cars/peugeot-207.webp"
    ],
    "features": [
      "سقف تمام شیشه‌ای پانوراما با سایه‌بان برقی",
      "فرمان برقی حساس به سرعت (EPS)",
      "سیستم مالتی‌مدیا لمسی با دوربین دید عقب",
      "کروز کنترل و محدودکننده سرعت",
      "رینگ‌های آلومینیومی اسپرت فابریک",
      "ترمزهای چهارچرخ دیسکی مجهز به ABS و EBD"
    ],
    "badges": [
      {
        "text": "کارشناسی شده",
        "type": "verified"
      },
      {
        "text": "صفر کیلومتر",
        "type": "zero"
      },
      {
        "text": "گارانتی فعال",
        "type": "clean"
      }
    ],
    "badge": "صفر روز",
    "isFeatured": true,
    "description": "پژو ۲۰۷ سقف شیشه‌ای تحویل روز ایران خودرو، دارای کارت طلایی، صفر خشک در پارکینگ مسقف، آماده تحویل فوری به همراه تمامی مدارک و برگه کارشناسی معتبر."
  },
  {
    "id": 3,
    "title": "دنا پلاس توربو اتوماتیک آپشنال",
    "brand": "ikco",
    "category": "iranian",
    "modelYear": "۱۴۰۳",
    "mileage": 4000,
    "mileageText": "۴,۰۰۰ کیلومتر (مشابه صفر)",
    "isZero": false,
    "price": 2940000000,
    "priceFormatted": "۲،۹۴۰،۰۰۰،۰۰۰ تومان",
    "priceMillion": 2940,
    "color": "سفید متالیک دوپوششه",
    "interiorColor": "مخمل مشکی با تریم طرح چوب",
    "gearbox": "۶ سرعته اتوماتیک تیپ‌ترونیک DAE",
    "fuel": "بنزین توربوشارژ",
    "engine": "EF7 TC توربوشارژ با ۱۵۰ اسب بخار",
    "bodyStatus": "کاملاً بدون رنگ و بدون خط و خش (مشابه صفر)",
    "chassisStatus": "شاسی‌های جلو و عقب کاملاً پلمپ کارخانه",
    "inspectionSummary": "کارشناسی شده رسمی با ضمانت کتبی سلامت",
    "insuranceMonths": 11,
    "insuranceText": "۱۱ ماه بیمه شخص ثالث معتبر",
    "warranty": "۳ سال یا ۶۰,۰۰۰ کیلومتر گارانتی فعال ایران خودرو",
    "documentStatus": "تک‌برگ سند، مدارک کامل آماده انتقال",
    "image": "images/cars/dena-plus.webp",
    "gallery": [
      "images/cars/dena-plus.webp"
    ],
    "features": [
      "سیستم ورود بدون کلید و استارت دکمه‌ای (Keyless)",
      "سنسور نور و سنسور باران خودکار",
      "سانروف دوحالته برقی",
      "صندلی‌های جلو برقی",
      "سیستم کنترل پایداری ESC و ترمز کمکی",
      "سیستم پایش فشار باد تایرها (TPMS)"
    ],
    "badges": [
      {
        "text": "کارشناسی شده",
        "type": "verified"
      },
      {
        "text": "در حد صفر",
        "type": "clean"
      },
      {
        "text": "۱۱ ماه بیمه",
        "type": "insurance"
      }
    ],
    "badge": "در حد صفر کارشناسی شده",
    "isFeatured": true,
    "description": "تیپ جدید آپشنال، بسیار تمیز و خانگی، سند دست اول و آماده تحویل فوری با تسویه نقدی یا اقساطی ۶ تا ۲۴ ماهه."
  }
];

const carBrands = (() => {
  const NAMES = { chery: 'اکستریم / مدیران خودرو', hyundai: 'هیوندای', ikco: 'ایران خودرو', saipa: 'سایپا' };
  const seen = [...new Set(carsData.map(c => c.brand).filter(Boolean))];
  return [{ key: 'all', name: 'همه برندها' },
    ...seen.map(k => ({ key: k, name: NAMES[k] || k }))];
})();

if (typeof window !== 'undefined') {
  window.carsData = carsData;
  window.carBrands = carBrands;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { carsData, carBrands };
}

