/**
 * موتور تعاملی وب‌سایت نمایشگاه نوین خودرو
 * Novin Khodro Interactive Engine & Fast Installment Calculator
 */

document.addEventListener('DOMContentLoaded', () => {
  // ۱. توابع کمکی تبدیل و فرمت‌بندی اعداد به فارسی (fa-IR Localization)
  function toPersianDigits(val) {
    if (val === null || val === undefined) return '';
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return val.toString().replace(/\d/g, x => farsiDigits[parseInt(x, 10)]);
  }

  function formatNumberFa(num) {
    if (num === null || num === undefined || isNaN(num)) return '۰';
    const parts = Math.round(num).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return toPersianDigits(parts.join('.'));
  }

  function formatTomans(num) {
    return `${formatNumberFa(num)} تومان`;
  }

  // نرمال‌سازی شماره همراه ایرانی: ارقام فارسی/عربی → ASCII و +98/0098/98 → 09XXXXXXXXX
  function normalizeMobile(raw) {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const ar = '٠١٢٣٤٥٦٧٨٩';
    return String(raw || '')
      .replace(/[۰-۹]/g, d => fa.indexOf(d))
      .replace(/[٠-٩]/g, d => ar.indexOf(d))
      .replace(/[^\d+]/g, '')
      .replace(/^(\+98|0098|98)/, '0')
      .replace(/^9/, '09');
  }

  function isValidMobile(phone) {
    return /^09\d{9}$/.test(phone);
  }

  // راند ۲۸: رندر اعداد فارسی برای بخش چرا ما با toPersianDigits
  document.querySelectorAll('[data-fa-digits]').forEach(el => {
    const raw = el.getAttribute('data-fa-digits');
    if (raw) el.textContent = toPersianDigits(raw);
  });

  // راند ۲۹: فرمت‌بندی خوانا (میلیارد/میلیون) برای مبالغ بزرگ
  function formatSmartTomans(num) {
    if (num === null || num === undefined || isNaN(num)) return '۰ تومان';
    if (num >= 1000000000) {
      const billions = num / 1000000000;
      const label = billions >= 10 ? Math.round(billions) : Math.round(billions * 100) / 100;
      return `${toPersianDigits(label.toString().replace('.', '٫'))} میلیارد تومان`;
    }
    return formatTomans(num);
  }

  // راند ۲: ارجاعات عناصر اصلی DOM
  const carsGrid = document.getElementById('carsGrid');
  const searchInput = document.getElementById('searchInput');
  const brandFilter = document.getElementById('brandFilter');
  const sortFilter = document.getElementById('sortFilter');
  const categoryPills = document.querySelectorAll('.cat-pill');
  
  const modalOverlay = document.getElementById('carModal');
  const modalCloseBtn = document.getElementById('modalClose');
  const modalContent = document.getElementById('modalDetailsBody');
  let lastFocusedElement = null;
  
  const sellCarForm = document.getElementById('sellCarForm');
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  const faqItems = document.querySelectorAll('.faq-item');

  let currentCategory = 'all';
  let currentBrand = 'all';
  let currentSort = 'featured';
  let searchQuery = '';

  // ۳. اسلایدر هیرو (Hero Slider)
  const slides = document.querySelectorAll(/** @type {'div'} */ ('.slide-item'));
  const dots = document.querySelectorAll(/** @type {'button'} */ ('.slider-dot'));
  const prevBtn = document.getElementById('prevSlide');
  const nextBtn = document.getElementById('nextSlide');
  let currentSlideIndex = 0;
  let sliderInterval = null;
  let sliderPaused = false;
  const pauseSlide = document.getElementById('pauseSlide');

  function showSlide(index) {
    if (slides.length === 0) return;
    slides.forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-hidden', 'true');
      s.inert = true;
    });
    dots.forEach(d => {
      d.classList.remove('active');
      d.setAttribute('aria-selected', 'false');
      d.setAttribute('tabindex', '-1');
    });

    currentSlideIndex = (index + slides.length) % slides.length;
    slides[currentSlideIndex].classList.add('active');
    slides[currentSlideIndex].setAttribute('aria-hidden', 'false');
    slides[currentSlideIndex].inert = false;
    if (dots[currentSlideIndex]) {
      dots[currentSlideIndex].classList.add('active');
      dots[currentSlideIndex].setAttribute('aria-selected', 'true');
      dots[currentSlideIndex].setAttribute('tabindex', '0');
    }
  }

  function startAutoSlide() {
    // WCAG 2.2.2: توقف خودکار در حالت reduced-motion
    if (sliderPaused || sliderInterval || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const region = document.querySelector('.slider-container');
    if (region && (region.contains(document.activeElement) || (region.matches && region.matches(':hover')))) return;
    sliderInterval = setInterval(() => {
      showSlide(currentSlideIndex + 1);
    }, 6000);
  }

  function stopAutoSlide() {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }

  function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
      showSlide(currentSlideIndex - 1);
      resetAutoSlide();
    });

    nextBtn.addEventListener('click', () => {
      showSlide(currentSlideIndex + 1);
      resetAutoSlide();
    });

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        showSlide(idx);
        resetAutoSlide();
      });
    });

    showSlide(0);
    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'tabpanel');
      if (dots[i]) slide.setAttribute('aria-labelledby', dots[i].id);
    });
    if (pauseSlide) pauseSlide.addEventListener('click', () => {
      sliderPaused = !sliderPaused;
      pauseSlide.setAttribute('aria-pressed', String(sliderPaused));
      pauseSlide.textContent = sliderPaused ? 'ادامهٔ اسلایدها' : 'توقف اسلایدها';
      resetAutoSlide();
    });
    document.addEventListener('visibilitychange', resetAutoSlide);
    startAutoSlide();

    // WCAG 2.2.2: توقف چرخش خودکار هنگام hover/focus کاربر روی اسلایدر
    const sliderRegion = document.querySelector(/** @type {'div'} */ ('.slider-container'));
    if (sliderRegion) {
      sliderRegion.addEventListener('mouseenter', stopAutoSlide);
      sliderRegion.addEventListener('mouseleave', resetAutoSlide);
      sliderRegion.addEventListener('focusin', stopAutoSlide);
      sliderRegion.addEventListener('focusout', () => setTimeout(resetAutoSlide, 0));

    // ناوبری کیبورد و سوایپ لمسی اسلایدر (tablist = فلش‌های افقی، آستانه ۵۰px)
    let touchStartX = null, touchStartY = null;
    sliderRegion.addEventListener('keydown', (e) => {
      if (!(e.target instanceof HTMLButtonElement) || !Array.from(dots).includes(e.target)) return;
      let index = currentSlideIndex;
      if (e.key === 'ArrowLeft') index++;
      else if (e.key === 'ArrowRight') index--;
      else if (e.key === 'Home') index = 0;
      else if (e.key === 'End') index = slides.length - 1;
      else return;
      e.preventDefault();
      showSlide(index);
      dots[currentSlideIndex].focus();
    });
    sliderRegion.addEventListener('touchstart', (e) => {
      touchStartX = touchStartY = null;
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    sliderRegion.addEventListener('touchend', (e) => {
      if (touchStartX === null || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartX = touchStartY = null;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      showSlide(currentSlideIndex + (dx < 0 ? 1 : -1));
      resetAutoSlide();
    });
    sliderRegion.addEventListener('touchcancel', () => { touchStartX = touchStartY = null; });
    }
  }

  // ۴. منوی ناوبری موبایل
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    const closeNavigation = () => {
      navLinks.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        closeNavigation();
        mobileToggle.focus();
      }
    });
    document.addEventListener('click', e => {
      if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) closeNavigation();
    });
    navLinks.addEventListener('focusout', e => {
      if (e.relatedTarget && !navLinks.contains(e.relatedTarget) && !mobileToggle.contains(e.relatedTarget)) closeNavigation();
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeNavigation();
      });
    });
  }

  // راند ۳۹: شمارنده نتایج مرئی کاتالوگ (اعداد فارسی) + اعلام زنده به صفحه‌خوان‌ها
  const resultsChip = document.getElementById('catalogResultsChip');


  // شمارش داینامیک هر تب دسته‌بندی از دادهٔ واقعی موجودی (به‌جای عدد ثابت در HTML)
  function updateCategoryCounts() {
    try {
    if (!categoryPills || !categoryPills.length) return;
    categoryPills.forEach((pill) => {
      const cat = pill.getAttribute('data-category') || 'all';
      let n;
      if (cat === 'all') n = carsData.length;
      else if (cat === 'zero') n = carsData.filter(c => c.isZero).length;
      else if (cat === 'used') n = carsData.filter(c => !c.isZero).length;
      else n = carsData.filter(c => c.category === cat).length;
      const base = (pill.getAttribute('data-base-label') || pill.textContent || '')
        .replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (!base) return;
      pill.setAttribute('data-base-label', base);
      pill.textContent = base + ' (' + toPersianDigits(n) + ')';
      pill.setAttribute('aria-label', base + '، ' + toPersianDigits(n) + ' خودرو');
    });
    } catch (e) { /* شمارش تزئینی است؛ نباید رندر را متوقف کند */ }
  }

  // ۵. رندر کارت‌های خودروها در کاتالوگ با برچسب‌های کارشناسی واضح
  function renderCars() {
    if (!carsGrid) return;
    updateCategoryCounts();
    let filtered = [...carsData];

    if (currentCategory === 'zero') {
      filtered = filtered.filter(car => car.isZero);
    } else if (currentCategory === 'used') {
      filtered = filtered.filter(car => !car.isZero);
    } else if (currentCategory !== 'all') {
      filtered = filtered.filter(car => car.category === currentCategory);
    }

    if (currentBrand !== 'all') {
      filtered = filtered.filter(car => car.brand === currentBrand);
    }

    if (searchQuery.trim() !== '') {
      const normalize = value => String(value || '').toLowerCase()
        .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
        .replace(/[\u200c\u064b-\u065f]/g, '').replace(/\s+/g, ' ').trim();
      const terms = normalize(searchQuery).split(' ');
      filtered = filtered.filter(car => {
        const text = normalize([car.title, car.modelYear, car.bodyStatus, car.color, car.gearbox].join(' '));
        return terms.every(term => text.includes(term));
      });
    }

    if (currentSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'mileage-asc') {
      filtered.sort((a, b) => a.mileage - b.mileage);
    } else if (currentSort === 'year-desc') {
      filtered.sort((a, b) => parseInt(b.modelYear.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))) - parseInt(a.modelYear.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
    } else {
      filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    // راند ۳۹: به‌روزرسانی شمارنده مرئی و ریجن زنده تعداد نتایج
    const catalogStatus = document.getElementById('catalogStatus');
    if (resultsChip) {
      resultsChip.textContent = `${toPersianDigits(filtered.length)} خودرو در نمایشگاه`;
      resultsChip.hidden = false;
    }
    if (catalogStatus) {
      catalogStatus.textContent = `${toPersianDigits(filtered.length)} خودرو با فیلتر فعلی نمایش داده شد.`;
    }

    carsGrid.innerHTML = '';

    if (filtered.length === 0) {
      carsGrid.innerHTML = `
        <div class="empty-inventory-box">
          <h3>خودرویی مطابق با جستجوی شما یافت نشد</h3>
          <p>جهت سفارش یا استعلام موجودی روز خودروی مورد نظر خود با شماره <strong>۰۲۱۶۶۱۲۰۳۳۲</strong> تماس حاصل فرمایید.</p>
          <button type="button" class="btn-reset-filters" id="resetFiltersBtn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 1 2.64 6.36"/><path d="M3 22v-6h6"/></svg>
            نمایش کل موجودی نمایشگاه
          </button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          currentCategory = 'all';
          currentBrand = 'all';
          currentSort = 'featured';
          searchQuery = '';
          if (searchInput) searchInput.value = '';
          if (brandFilter) brandFilter.value = 'all';
          if (sortFilter) sortFilter.value = 'featured';
          categoryPills.forEach(p => {
            const isAll = p.getAttribute('data-category') === 'all';
            p.classList.toggle('active', isAll);
            p.setAttribute('aria-pressed', isAll ? 'true' : 'false');
          });
          renderCars();
          if (searchInput) searchInput.focus();
        });
      }
      return;
    }

    filtered.forEach(car => {
      const card = document.createElement('article');
      card.className = 'car-card-modern';

      const whatsappText = encodeURIComponent(`سلام وقت بخیر، در مورد شرایط خرید نقد یا اقساطی خودروی «${car.title} مدل ${car.modelYear}» به قیمت «${car.priceFormatted}» در نمایشگاه نوین خودرو راهنمایی می‌خواستم.`);

      // تولید نشان‌های کارشناسی خودرو
      const badgesHtml = car.badges.map(b => `
        <span class="inspection-tag-badge badge-${b.type}">${b.text}</span>
      `).join('');

      card.innerHTML = `
        <div class="card-media">
          <img src="${car.image}" alt="${car.title}" width="400" height="220" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+'">
          <div class="card-badges-cluster">
            ${badgesHtml}
          </div>
        </div>

        <div class="card-info">
          <div class="card-info-header">
            <h3 class="card-car-name">${(window.CAR_SLUGS && window.CAR_SLUGS[car.id]) ? `<a class="card-car-link" href="/cars/${window.CAR_SLUGS[car.id]}.html">${car.title}</a>` : car.title}</h3>
            <span class="card-car-year">مدل ${car.modelYear}</span>
          </div>

          <div class="card-specs-minimal">
            <div class="spec-col">
              <span class="spec-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg></span>
              <span class="spec-title">کارکرد</span>
              <span class="spec-val">${car.mileageText}</span>
            </div>
            <div class="spec-col">
              <span class="spec-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
              <span class="spec-title">گیربکس</span>
              <span class="spec-val spec-val-gearbox">${(car.gearboxShort || car.gearbox.split(' ').slice(0, 2).join(' '))}</span>
            </div>
            <div class="spec-col">
              <span class="spec-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></span>
              <span class="spec-title">بیمه ثالث</span>
              <span class="spec-val">${toPersianDigits(car.insuranceMonths)} ماهه</span>
            </div>
          </div>

          <div class="card-bottom-actions">
            <div class="card-price-row">
              <span class="price-row-group">
                <span class="price-val">${car.priceFormatted.replace(' تومان', '')}</span>
                <span class="price-unit">تومان</span>
              </span>
            </div>

            <div class="action-buttons-group">
              <button type="button" class="btn-show-details" onclick="openCarModal(${car.id}, this)" aria-label="مشاهده کارشناسی و مشخصات کامل ${car.title}">
                مشاهده کارشناسی و مشخصات
              </button>
              <a href="https://wa.me/982166120332?text=${whatsappText}" target="_blank" rel="noopener" class="btn-whatsapp-inquire" aria-label="استعلام واتساپ برای ${car.title}">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.071.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.922l-1.656 6.053 6.223-1.633c1.701.927 3.649 1.458 5.72 1.458 6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
                </svg>
                استعلام واتساپ
              </a>
            </div>
          </div>
        </div>
      `;
      carsGrid.appendChild(card);
      if (window.IkcoBridge && typeof window.IkcoBridge.decorateCard === 'function') {
        window.IkcoBridge.decorateCard(card, car);
      }
    });
  }

  // رویدادهای فیلتر دسته‌بندی
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
      currentCategory = pill.getAttribute('data-category');
      renderCars();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderCars();
    });
  }

  if (brandFilter) {
    brandFilter.addEventListener('change', (e) => {
      currentBrand = e.target.value;
      renderCars();
    });
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCars();
    });
  }

  // ۶. محاسبه‌گر پیشرفته و آنی اقساط («خرید از شما، اقساط از ما»)
  const calcPriceSlider = document.getElementById('calcPriceSlider');
  const calcPriceBadge = document.getElementById('calcPriceBadge');
  const downPaymentPercent = document.getElementById('downPaymentPercent');
  const downPaymentBadge = document.getElementById('downPaymentBadge');
  const tenureBadge = document.getElementById('tenureBadge');
  
  const pricePills = document.querySelectorAll('.price-pill');
  const downPills = document.querySelectorAll('.down-pill');
  const tenureBtns = document.querySelectorAll('.tenure-btn');
  
  const resDownPayment = document.getElementById('resDownPayment');
  const resLoanAmount = document.getElementById('resLoanAmount');
  const resMonthlyInstallment = document.getElementById('resMonthlyInstallment');
  const resTotalInterest = document.getElementById('resTotalInterest');
  const resTotalPayback = document.getElementById('resTotalPayback');
  const btnApplyLoan = document.getElementById('btnApplyLoan');
  const calcInlineNote = document.getElementById('calcInlineNote');
  const calcResultsBox = document.getElementById('calcResultsBox');
  const calcControlGroups = document.querySelectorAll('.calculator-card .calc-control-group');

  let selectedTenureMonths = 12;

  // حالت فعال مرحله‌ها: اسلایدر/گروه در حال تعامل با حاشیه طلایی برجسته می‌شود
  function setActiveCalcStep(index) {
    calcControlGroups.forEach((group, i) => {
      group.classList.toggle('active', i === index);
    });
  }

  calcControlGroups.forEach((group, index) => {
    group.addEventListener('focusin', () => setActiveCalcStep(index));
    group.addEventListener('pointerdown', () => setActiveCalcStep(index));
    group.addEventListener('focusout', (e) => {
      if (!group.contains(e.relatedTarget)) setActiveCalcStep(-1);
    });
  });

  // پیام اعتبارسنجی درون‌خطی فارسی (بدون تغییر منطق محاسبات)
  function showInlineNote(message, type = 'warning') {
    if (!calcInlineNote) return;
    if (!message) {
      calcInlineNote.hidden = true;
      calcInlineNote.textContent = '';
      calcInlineNote.classList.remove('note-warning', 'note-info', 'note-error');
      return;
    }
    calcInlineNote.hidden = false;
    calcInlineNote.textContent = message;
    calcInlineNote.classList.remove('note-warning', 'note-info', 'note-error');
    calcInlineNote.classList.add(`note-${type}`);
  }

  // راند ۲۹: حالت خطای واضح محاسبه‌گر — پاک‌سازی خروجی‌ها و غیرفعال‌سازی ارسال
  function enterCalcErrorState(message) {
    if (calcResultsBox) calcResultsBox.classList.add('calc-error');
    [resDownPayment, resLoanAmount, resMonthlyInstallment, resTotalInterest, resTotalPayback]
      .forEach(el => { if (el) el.textContent = '—'; });
    showInlineNote(message, 'error');
    if (btnApplyLoan) {
      btnApplyLoan.removeAttribute('href');
      btnApplyLoan.setAttribute('aria-disabled', 'true');
      btnApplyLoan.classList.add('btn-disabled');
    }
  }

  function exitCalcErrorState() {
    if (calcResultsBox) calcResultsBox.classList.remove('calc-error');
    if (btnApplyLoan) {
      btnApplyLoan.setAttribute('href', '#');
      btnApplyLoan.removeAttribute('aria-disabled');
      btnApplyLoan.classList.remove('btn-disabled');
    }
  }

  function calculateInstallments() {
    if (!calcPriceSlider || !downPaymentPercent) return;

    const carPriceMillion = parseInt(calcPriceSlider.value, 10);
    const downPercent = parseInt(downPaymentPercent.value, 10);
    const carPrice = carPriceMillion * 1000000;

    // راند ۲۹: اعتبارسنجی سخت ورودی‌ها — در صورت نامعتبر بودن، حالت خطای شفاف نمایش داده می‌شود
    const inputsInvalid = !Number.isFinite(carPriceMillion) || !Number.isFinite(downPercent) ||
      carPriceMillion < 300 || carPriceMillion > 12000 ||
      downPercent < 40 || downPercent > 70 || !Number.isFinite(selectedTenureMonths);
    if (inputsInvalid) {
      enterCalcErrorState('لطفاً ارزش خودرو بین ۳۰۰ میلیون تا ۱۲ میلیارد تومان و پیش‌پرداخت بین ۴۰٪ تا ۷۰٪ انتخاب شود.');
      return;
    }
    exitCalcErrorState();
    
    // محاسبات دقیق مالی
    const downPaymentVal = Math.round(carPrice * (downPercent / 100));
    const loanAmountVal = Math.round(carPrice - downPaymentVal);
    
    // کارمزد ماهانه استاندارد (۳.۵٪ ماهانه تسهیلات خودرویی)
    const monthlyRate = 0.035;
    const totalInterest = loanAmountVal * monthlyRate * selectedTenureMonths;
    const totalPayback = loanAmountVal + totalInterest;
    const monthlyPayment = Math.round(totalPayback / selectedTenureMonths);

    // به‌روزرسانی برچسب‌های کنترل‌ها با اعداد فارسی
    calcPriceBadge.textContent = `${formatNumberFa(carPriceMillion)} میلیون تومان`;
    downPaymentBadge.textContent = `${toPersianDigits(downPercent)}٪ (${formatNumberFa(Math.round(downPaymentVal / 1000000))} میلیون تومان)`;
    if (tenureBadge) tenureBadge.textContent = `${toPersianDigits(selectedTenureMonths)} ماهه`;

    // همگام‌سازی زنده ARIA با مقدار فعلی اسلایدرها (فرمت فارسی)
    calcPriceSlider.setAttribute('aria-valuenow', String(carPriceMillion));
    calcPriceSlider.setAttribute('aria-valuetext', `${formatNumberFa(carPriceMillion)} میلیون تومان`);
    downPaymentPercent.setAttribute('aria-valuenow', String(downPercent));
    downPaymentPercent.setAttribute('aria-valuetext', `${toPersianDigits(downPercent)} درصد (معادل ${formatNumberFa(Math.round(downPaymentVal / 1000000))} میلیون تومان)`);

    // به‌روزرسانی خروجی‌های محاسباتی (فرمت دقیق + خلاصه خوانا)
    resDownPayment.textContent = formatTomans(downPaymentVal);
    resLoanAmount.textContent = formatTomans(loanAmountVal);
    resMonthlyInstallment.textContent = `${formatNumberFa(monthlyPayment)} تومان / ماه`;
    if (resTotalInterest) resTotalInterest.textContent = formatTomans(totalInterest);
    if (resTotalPayback) resTotalPayback.textContent = formatTomans(totalPayback);

    // همگام‌سازی کلیدهای پیش‌فرض قیمت
    pricePills.forEach(pill => {
      const pillVal = parseInt(pill.getAttribute('data-price'), 10);
      pill.classList.toggle('active', pillVal === carPriceMillion);
      pill.setAttribute('aria-pressed', pillVal === carPriceMillion ? 'true' : 'false');
    });

    // همگام‌سازی کلیدهای پیش‌فرض درصد پیش‌پرداخت
    downPills.forEach(pill => {
      const pillVal = parseInt(pill.getAttribute('data-percent'), 10);
      pill.classList.toggle('active', pillVal === downPercent);
      pill.setAttribute('aria-pressed', pillVal === downPercent ? 'true' : 'false');
    });

    // همگام‌سازی aria-pressed کلیدهای مدت بازپرداخت
    tenureBtns.forEach(btn => {
      const months = parseInt(btn.getAttribute('data-months'), 10);
      btn.setAttribute('aria-pressed', months === selectedTenureMonths ? 'true' : 'false');
    });

    // اعتبارسنجی درون‌خطی راهنما (فقط پیام، بدون تغییر در محاسبات)
    if (loanAmountVal > 2500000000) {
      showInlineNote('سقف تسهیلات استاندارد نوین خودرو ۲,۵۰۰,۰۰۰,۰۰۰ تومان است؛ برای مبالغ بالاتر، کارشناس اعتباری شرایط شما را به‌صورت اختصاصی بررسی می‌کند.', 'warning');
    } else if (downPercent === 40 && carPrice > 2000000000) {
      showInlineNote('با پیش‌پرداخت ۴۰ درصدی در این محدوده قیمت، بررسی صلاحیت اعتباری دقیق‌تری اعمال می‌شود؛ کارشناسان ما شرایط شما را راهنمایی می‌کنند.', 'info');
    } else {
      showInlineNote('');
    }

    // لینک واتساپ با پیام جامع و آماده به زبان فارسی
    if (btnApplyLoan) {
      const rawMessage = `سلام و احترام،
درخواست ثبت‌نام و مشاوره در طرح «خرید از شما، اقساط از ما» نمایشگاه نوین خودرو را دارم:
• ارزش کل خودرو: ${formatNumberFa(carPriceMillion)} میلیون تومان (${formatSmartTomans(carPrice)})
• پیش‌پرداخت نقدی (${toPersianDigits(downPercent)}٪): ${formatTomans(downPaymentVal)}
• تسهیلات دریافتی از نوین: ${formatTomans(loanAmountVal)}
• مدت بازپرداخت: ${toPersianDigits(selectedTenureMonths)} ماهه
• مبلغ هر قسط ماهیانه: ${formatNumberFa(monthlyPayment)} تومان
• مجموع کارمزد اقساط: ${formatTomans(totalInterest)}
• جمع کل بازپرداخت: ${formatSmartTomans(totalPayback)} (${formatTomans(totalPayback)})

لطفاً جهت راهنمایی، زمان بازدید و مدارک مورد نیاز تماس بگیرید.`;
      
      btnApplyLoan.href = `https://wa.me/982166120332?text=${encodeURIComponent(rawMessage)}`;
    }

    // سنجش بازدهی: فقط زمانی که ترکیب محاسبه عوض شود (اسلایدر input پیوسته فایر می‌کند)
    const calcSignature = `${carPriceMillion}|${downPercent}|${selectedTenureMonths}|${monthlyPayment}`;
    if (typeof window.nkTrack === 'function' && window.__nkLastCalc !== calcSignature) {
      window.__nkLastCalc = calcSignature;
      window.nkTrack('calc', { p: selectedTenureMonths, v: monthlyPayment, r: downPercent });
    }
  }

  if (calcPriceSlider && downPaymentPercent) {
    calcPriceSlider.addEventListener('input', calculateInstallments);
    downPaymentPercent.addEventListener('input', calculateInstallments);

    pricePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const val = pill.getAttribute('data-price');
        calcPriceSlider.value = val;
        calculateInstallments();
      });
    });

    downPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const val = pill.getAttribute('data-percent');
        downPaymentPercent.value = val;
        calculateInstallments();
      });
    });

    tenureBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tenureBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTenureMonths = parseInt(btn.getAttribute('data-months'), 10);
        calculateInstallments();
      });
    });

    calculateInstallments();
  }

  // ۶٫۱ صندوق سرنخ: کلیک «استعلام اقساط» = درخواست واقعی مشتری (حتی اگر پیام واتساپ ارسال نشود)
  if (btnApplyLoan) {
    btnApplyLoan.addEventListener('click', () => {
      if (typeof window.nkLead !== 'function') return;
      const parts = String(window.__nkLastCalc || '').split('|');
      window.nkLead('calc', {
        p: parts[2] || '',
        v: parts[3] || '',
        m: parts[0] || '',
      });
    });
  }

  // ۷. باز و بسته شدن سوالات متداول (FAQ)
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;
    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      faqItems.forEach(i => {
        i.classList.remove('open');
        const btn = i.querySelector('.faq-question');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ۸. مودال جزئیات و شناسنامه کارشناسی خودرو
  window.openCarModal = function(carId, trigger) {
    const car = carsData.find(c => c.id === carId);
    if (!car || !modalContent || !modalOverlay) return;
    if (typeof window.nkTrack === 'function') {
      window.nkTrack('modal', { c: car.id, v: car.priceMillion });
    }

    const downPaymentHalf = formatTomans(car.price * 0.5);

    const featuresHtml = car.features.map(f => `
      <div class="modal-feature-item">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#059669" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <span>${f}</span>
      </div>
    `).join('');

    const thumbnailsHtml = car.gallery.map((img, index) => `
      <button type="button" class="modal-thumb-btn ${index === 0 ? 'active' : ''}" onclick="switchModalImage('${img}', this)" aria-label="تصویر ${toPersianDigits(index + 1)} خودرو">
        <img src="${img}" alt="${car.title} - تصویر ${toPersianDigits(index + 1)}" width="80" height="60" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI2MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=='">
      </button>
    `).join('');

    // راند ۳۷: ناوبری تصاویر مودال (فلش‌ها + شمارنده) در صورت وجود چند تصویر
    const galleryLen = (car.gallery && car.gallery.length) || (car.image ? 1 : 0);
    const hasGallery = galleryLen > 1;
    const navArrowsHtml = hasGallery ? `
          <button type="button" class="modal-nav-arrow modal-nav-next" onclick="modalNavImage(1)" aria-label="تصویر بعدی" ${1 >= galleryLen ? 'disabled' : ''}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button type="button" class="modal-nav-arrow modal-nav-prev" onclick="modalNavImage(-1)" aria-label="تصویر قبلی" disabled>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </button>` : '';
    const counterHtml = galleryLen >= 1 ? `
          <div class="modal-img-counter" id="modalImgCounter">${toPersianDigits(1)}/${toPersianDigits(galleryLen)}</div>` : '';

    const whatsappText = encodeURIComponent(`سلام و احترام، جهت بازدید و خرید نقدی یا اقساطی خودروی «${car.title} مدل ${car.modelYear}» به ارزش ${car.priceFormatted} در نمایشگاه نوین خودرو پیام می‌دهم.`);

    modalContent.innerHTML = `
      <div class="modal-gallery-wrapper">
        <div class="modal-main-img-box">
          <img id="modalMainImg" src="${car.gallery[0] || car.image}" alt="${car.title}" width="800" height="600" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+'">
          <div class="modal-img-badge">${car.badge || 'کارشناسی شده'}</div>${navArrowsHtml}${counterHtml}
        </div>
        <div class="modal-thumbs-row">
          ${thumbnailsHtml}
        </div>
      </div>

      <div class="modal-header-info">
        <h2 id="modalCarTitle" class="modal-car-title">${car.title} <span class="modal-year-tag">مدل ${car.modelYear}</span></h2>
        
        <div class="modal-price-strip">
          <div class="modal-cash-price">
            <span class="price-strip-label">قیمت نقدی کارشناسی:</span>
            <strong>${car.priceFormatted}</strong>
          </div>
          <div class="modal-inst-pill">
            <span>شرایط اقساطی:</span>
            <strong>پیش‌پرداخت ${downPaymentHalf}</strong>
          </div>
        </div>
      </div>

      <!-- شناسنامه کارشناسی و سلامت نوین خودرو -->
      <div class="inspection-certificate-card">
        <div class="cert-header">
          <div class="cert-seal">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4>شناسنامه کارشناسی و تضمین سلامت نوین خودرو</h4>
            <p>کارشناسی رسمی سلامت رنگ، شاسی، موتور، گیربکس و اصالت مدارک</p>
          </div>
        </div>

        <div class="cert-grid">
          <div class="cert-item">
            <span class="cert-label">وضعیت کارکرد:</span>
            <strong class="cert-val">${car.mileageText}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">وضعیت بدنه و رنگ:</span>
            <strong class="cert-val">${car.bodyStatus}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">وضعیت شاسی‌ها:</span>
            <strong class="cert-val">${car.chassisStatus}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">بیمه شخص ثالث:</span>
            <strong class="cert-val">${car.insuranceText}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">گارانتی و ضمانت:</span>
            <strong class="cert-val">${car.warranty}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">وضعیت اسناد و مدارک:</span>
            <strong class="cert-val">${car.documentStatus}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">رنگ و تریم داخل:</span>
            <strong class="cert-val">${car.interiorColor}</strong>
          </div>
          <div class="cert-item">
            <span class="cert-label">گیربکس و پیشرانه:</span>
            <strong class="cert-val">${car.gearbox}</strong>
          </div>
        </div>
      </div>

      <div class="modal-section-box">
        <h4 class="modal-sub-heading">آپشن‌ها و تجهیزات رفاهی و ایمنی:</h4>
        <div class="modal-features-grid">
          ${featuresHtml}
        </div>
      </div>

      <div class="modal-desc-box">
        <p>${car.description}</p>
      </div>

      <!-- دکمه‌های اقدام مودال -->
      <div class="modal-footer-actions">
        <a href="tel:02166120332" class="btn-modal-call" aria-label="تماس تلفنی برای رزرو بازدید ۰۲۱۶۶۱۲۰۳۳۲">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>تماس و هماهنگی بازدید (۰۲۱۶۶۱۲۰۳۳۲)</span>
        </a>
        <a href="https://wa.me/982166120332?text=${whatsappText}" target="_blank" rel="noopener" class="btn-modal-whatsapp" aria-label="استعلام خرید در واتساپ">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.071.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.922l-1.656 6.053 6.223-1.633c1.701.927 3.649 1.458 5.72 1.458 6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
          </svg>
          <span>استعلام شرایط در واتساپ</span>
        </a>
      </div>
    `;

    modalOverlay.classList.add('active');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (modalContent.dataset) {
      modalContent.dataset.gallery = JSON.stringify(car.gallery && car.gallery.length ? car.gallery : (car.image ? [car.image] : []));
      modalContent.dataset.imgIndex = '0';
    }
    lastFocusedElement = trigger || document.activeElement;
    if (modalCloseBtn) modalCloseBtn.focus();
  };

  window.switchModalImage = function(src, thumbBtn) {
    const mainImg = document.getElementById('modalMainImg');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.modal-thumb-btn').forEach(t => t.classList.remove('active'));
    if (thumbBtn) {
      thumbBtn.classList.add('active');
      const thumbs = Array.prototype.slice.call(document.querySelectorAll('.modal-thumb-btn'));
      const idx = thumbs.indexOf(thumbBtn);
      if (idx >= 0 && modalContent.dataset) {
        modalContent.dataset.imgIndex = String(idx);
        updateModalCounter(idx);
      }
    }
  };

  // راند ۳۷: ناوبری با فلش و کیبورد بین تصاویر مودال (سازگار با RTL)
  function updateModalCounter(idx) {
    const counter = document.getElementById('modalImgCounter');
    const gallery = modalContent.dataset.gallery ? JSON.parse(modalContent.dataset.gallery) : [];
    if (counter && gallery.length) {
      counter.textContent = `${toPersianDigits(idx + 1)}/${toPersianDigits(gallery.length)}`;
    }
  }

  window.modalNavImage = function(step) {
    const mainImg = document.getElementById('modalMainImg');
    const gallery = modalContent && modalContent.dataset.gallery ? JSON.parse(modalContent.dataset.gallery) : [];
    if (!mainImg || gallery.length < 2) return;
    let idx = (parseInt(modalContent.dataset.imgIndex || '0', 10) || 0) + step;
    idx = Math.max(0, Math.min(gallery.length - 1, idx));
    if (idx === parseInt(modalContent.dataset.imgIndex || '0', 10)) return;
    modalContent.dataset.imgIndex = String(idx);
    mainImg.classList.remove('modal-img-fade');
    void mainImg.offsetWidth;
    mainImg.src = gallery[idx];
    mainImg.classList.add('modal-img-fade');
    const thumbs = document.querySelectorAll('.modal-thumb-btn');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
    updateModalCounter(idx);
    const prevBtn = modalContent.querySelector('.modal-nav-prev');
    const nextBtn = modalContent.querySelector('.modal-nav-next');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === gallery.length - 1;
  };

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
      modalOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
    }
  }

  // تله فوکوس (Focus Trap) برای دسترس‌پذیری صفحه‌خوان‌ها
  modalOverlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !modalOverlay.classList.contains('active')) return;
    const focusable = modalOverlay.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const controls = Array.from(focusable).filter(el =>
      !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility === 'visible');
    if (!controls.length) return;
    e.preventDefault();
    const index = controls.indexOf(document.activeElement);
    const next = index < 0 ? (e.shiftKey ? controls.length - 1 : 0)
      : (index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus();
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });

  // راند ۳۷: کیبورد ArrowLeft/ArrowRight برای تغییر تصویر مودال (جهت RTL)
  if (modalOverlay) {
    modalOverlay.addEventListener('keydown', (e) => {
      if (!modalOverlay.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (typeof window.modalNavImage === 'function') window.modalNavImage(1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (typeof window.modalNavImage === 'function') window.modalNavImage(-1);
      }
    });
  }

  // ۹. ثبت فرم فروش فوری خودرو: اعتبارسنجی + تحویل واقعی سرنخ به واتساپ کارشناس
  if (sellCarForm) {
    sellCarForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fieldVal = (id) => {
        const el = document.getElementById(id);
        return el && el.value ? el.value.trim() : '';
      };
      const carModel = fieldVal('sellCarModel');
      const carYear = fieldVal('sellCarYear');
      const carMileage = fieldVal('sellCarMileage');
      const ownerPhone = normalizeMobile(fieldVal('sellOwnerPhone'));

      if (!carModel || !ownerPhone) {
        showToast('لطفاً نام خودرو و شماره تماس همراه خود را وارد فرمایید.', 'error');
        return;
      }
      if (!isValidMobile(ownerPhone)) {
        showToast('شماره تماس همراه معتبر نیست. نمونه صحیح: ۰۹۱۲۳۴۵۶۷۸۹', 'error');
        return;
      }

      const lead = `سلام و احترام، درخواست فروش خودرو در نمایشگاه نوین خودرو:\n`
        + `خودرو: ${carModel}\n`
        + (carYear ? `سال ساخت: ${carYear}\n` : '')
        + (carMileage ? `کارکرد: ${carMileage}\n` : '')
        + `شماره تماس من: ${ownerPhone}`;
      const waUrl = `https://wa.me/982166120332?text=${encodeURIComponent(lead)}`;
      try {
        if (typeof window.open === 'function') {
          window.open(waUrl, '_blank', 'noopener');
        } else {
          window.location.href = waUrl;
        }
      } catch (err) {
        window.location.href = waUrl;
      }

      showToast('مشخصات شما آماده شد؛ برای نهایی شدن درخواست، پیام واتساپ را ارسال کنید. کارشناسان حداکثر ظرف ۲ ساعت پاسخ می‌دهند.', 'success');
      // ثبت در صندوق سرنخ (حتی اگر کاربر پیام واتساپ را نفرستد، درخواست از دست نمی‌رود)
      if (typeof window.nkLead === 'function') {
        window.nkLead('sell', {
          n: carModel,
          ph: ownerPhone,
          v: [carYear, carMileage].filter(Boolean).join(' / '),
          p: 'sell-car',
        });
      }
      if (typeof window.nkTrack === 'function') {
        window.nkTrack('lead', { p: 'sell-car', c: carModel, v: carMileage || carYear || '' });
      }
      sellCarForm.reset();
    });
  }

  // ۱۰. سیستم توست اعلان‌های کاربرپسند
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 15);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // رندر اولیه موجودی خودروها
  renderCars();

  // ۱۱. reveal هدفمند (فاز ۵) — progressive enhancement: بدون JS هیچ‌چیز پنهان نمی‌ماند
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    const REVEALABLE = '.nk-head, .car-card-modern, .why-us-card, .zero-price-card, .ency-card, .faq-item, .sell-banner-box, .contact-section-clean';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, idx) => {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--nk-reveal-delay', `${Math.min(idx, 5) * 40}ms`);
        entry.target.classList.add('nk-revealed');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    // رندرهای async (دانشنامه → #encyGrid) بعد از init اجرا می‌شوند؛ اگر فقط
    // یک‌بار querySelectorAll بزنیم کارت‌ها observe نمی‌شوند و تا ابد opacity:0 می‌مانند
    const observeRevealables = () => {
      document.querySelectorAll(REVEALABLE).forEach((el) => {
        if (!el.classList.contains('nk-revealed')) io.observe(el);
      });
    };
    observeRevealables();
    window.NovinReveal = observeRevealables;
  }
});
