/**
 * main.js – Core UI interactions
 * Lumière Beauty
 */

// ── Navbar scroll effect ──────────────────────────────────────
const navbar = document.getElementById('navbar');

function handleNavbarScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('navbar-scrolled');
    navbar.classList.remove('navbar-transparent');
  } else {
    navbar.classList.remove('navbar-scrolled');
    navbar.classList.add('navbar-transparent');
  }
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });
handleNavbarScroll(); // run on load


// ── Scroll To Top ─────────────────────────────────────────────
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    scrollTopBtn.classList.add('visible');
  } else {
    scrollTopBtn.classList.remove('visible');
  }
}, { passive: true });

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ── Mobile Menu ───────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('hidden');
}


// ── Filter Buttons ─────────────────────────────────────────────
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});


// ── Toast Notification ────────────────────────────────────────
let toastTimeout;
let toastProductKey = null;
function showToast(key, variables = {}, productKey = null) {
  const toast   = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toastProductKey = productKey;
  toastMsg.dataset.i18n = key;
  toastMsg.dataset.i18nVars = JSON.stringify(variables);
  toastMsg.textContent = TranslationManager.t(key, variables);
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}


// ── Add to Cart (UI hook – cart.js handles data) ──────────────
function addToCart(btnEl) {
  const productKey = btnEl.closest('.product-card').querySelector('h3[data-i18n]').dataset.i18n;
  if (btnEl.dataset.adding === 'true') return;
  btnEl.dataset.adding = 'true';
  // Visual feedback on the quick-add bar
  const original = btnEl.innerHTML;
  btnEl.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i><span data-i18n="messages.added"></span>';
  TranslationManager.apply();
  btnEl.style.background = '#10b981';
  setTimeout(() => {
    btnEl.innerHTML = original;
    btnEl.style.background = '';
    delete btnEl.dataset.adding;
    TranslationManager.apply();
  }, 1400);

  // Update cart counter
  const counter = document.getElementById('cartCount');
  counter.textContent = parseInt(counter.textContent || '0') + 1;

  showToast('messages.cart_added', { product: TranslationManager.t(productKey) }, productKey);
}

document.addEventListener('translationmanager:language-changed', () => {
  if (!toastProductKey) return;
  const toastMsg = document.getElementById('toastMsg');
  const variables = { product: TranslationManager.t(toastProductKey) };
  toastMsg.dataset.i18nVars = JSON.stringify(variables);
  toastMsg.textContent = TranslationManager.t('messages.cart_added', variables);
});


// ── Smooth appear on scroll ───────────────────────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  const animEls = document.querySelectorAll(
    '.product-card, .category-card, .review-card, .insta-item'
  );
  animEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`;
    observer.observe(el);
  });
});
