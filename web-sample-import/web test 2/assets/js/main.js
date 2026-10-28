/* ============================================================
   TechStore – main.js
   All interactive behaviours for index, login, register, dashboard
   ============================================================ */

/* ── Utilities ────────────────────────────────────────── */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ================================================================
   1. LANGUAGE DROPDOWN
      Switches between imported Vietnamese and English translations.
   ================================================================ */
function initLangDropdown() {
  const wrap = $('#langDropdownWrap');
  if (!wrap) return;
  const btn   = $('#langBtn', wrap);
  const menu  = $('#langMenu', wrap);

  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  $$('.lang-option', wrap).forEach(opt => {
    opt.addEventListener('click', () => {
      const text = opt.textContent.trim();
      const code = text.includes('Việt') ? 'VI'
                 : text.includes('Eng')  ? 'EN'
                 : text.includes('日本')  ? 'JP'
                 : text.includes('한국')  ? 'KR' : 'VI';
      menu.classList.add('hidden');

      if (code === 'VI' || code === 'EN') {
        document.dispatchEvent(new CustomEvent('techstore:language-change', {
          detail: { language: code.toLowerCase() },
        }));
      } else {
        showToast('Hiện chỉ hỗ trợ Tiếng Việt và English.');
      }
    });
  });

  document.addEventListener('click', () => menu.classList.add('hidden'));
}

/* ================================================================
   2. NAVBAR SCROLL EFFECT
   ================================================================ */
function initNavbar() {
  const nav = $('#navbar');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ================================================================
   3. MOBILE MENU TOGGLE (index)
   ================================================================ */
function initMobileMenu() {
  const btn  = $('#mobileMenuBtn');
  const menu = $('#mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

/* ================================================================
   4. PRODUCT FILTER
   ================================================================ */
let currentFilter = 'all';

function setFilter(btn, cat) {
  currentFilter = cat;
  $$('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterProducts();
}

function filterCategory(cat) {
  // Scroll to products then filter
  const sec = $('#products');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' });
  currentFilter = cat;
  const btn = $$(`.filter-btn`).find(b => b.textContent.toLowerCase().includes(
    cat === 'laptop' ? 'laptop'
  : cat === 'phone'  ? 'điện'
  : cat === 'tablet' ? 'máy tính'
  : cat === 'audio'  ? 'âm'
  : cat === 'watch'  ? 'đồng'
  : 'phụ'
  ));
  if (btn) { $$('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  filterProducts();
}

function filterProducts() {
  $$('#productGrid .product-card').forEach(card => {
    const match = currentFilter === 'all' || card.dataset.cat === currentFilter;
    card.classList.toggle('hidden-card', !match);
  });
}

/* ================================================================
   5. CART COUNTER
   ================================================================ */
let cartCount = 3;

function addToCart(btn) {
  // Animate button
  btn.classList.add('added');
  btn.innerHTML = '<i class="fa-solid fa-check"></i>';
  setTimeout(() => {
    btn.classList.remove('added');
    btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
  }, 1500);

  // Update counter in navbar
  cartCount++;
  const badge = document.querySelector('button .fa-bag-shopping + span, button > span');
  const cartBadge = document.querySelector('nav .relative.-top-1');
  if (cartBadge) cartBadge.textContent = cartCount;

  showToast('Đã thêm vào giỏ hàng!');
}

/* ================================================================
   6. TOAST NOTIFICATION
   ================================================================ */
let toastTimeout;
function showToast(msg = 'Thành công!') {
  const toast    = $('#toast');
  const toastMsg = $('#toastMsg');
  if (!toast) return;
  if (toastMsg) toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 2800);
}

/* ================================================================
   7. COUNTDOWN TIMER (hero promo)
   ================================================================ */
function initCountdown() {
  const hEl = $('#countH'), mEl = $('#countM'), sEl = $('#countS');
  if (!hEl) return;
  let totalSec = 8 * 3600 + 34 * 60 + 21;
  const tick = () => {
    if (totalSec <= 0) return;
    totalSec--;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    hEl.textContent = String(h).padStart(2, '0');
    mEl.textContent = String(m).padStart(2, '0');
    sEl.textContent = String(s).padStart(2, '0');
  };
  setInterval(tick, 1000);
}

/* ================================================================
   8. AUTH FORMS
   ================================================================ */
function handleLogin(e) {
  e.preventDefault();
  const btn = $('#loginSubmit');

  // ── TEST MODE: bỏ qua kiểm tra, vào thẳng dashboard ──
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Đang đăng nhập...';

  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Thành công!';
    btn.style.background = 'linear-gradient(135deg, #00D4AA, #00B894)';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  }, 900);
}

function handleRegister(e) {
  e.preventDefault();
  const pass     = $('#regPass')?.value;
  const passConf = $('#regPassConf')?.value;
  const success  = $('#registerSuccess');

  if (pass !== passConf) {
    showToast('Mật khẩu xác nhận không khớp!');
    return;
  }
  if (pass.length < 8) {
    showToast('Mật khẩu phải có ít nhất 8 ký tự!');
    return;
  }
  // Show success
  success?.classList.remove('hidden');
  setTimeout(() => { window.location.href = 'login.html'; }, 2500);
}

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? '<i class="fa-regular fa-eye"></i>'
    : '<i class="fa-regular fa-eye-slash"></i>';
}

/* ================================================================
   9. PASSWORD STRENGTH METER
   ================================================================ */
function checkStrength(val) {
  const bars    = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const textEl  = document.getElementById('strengthText');
  if (!bars[0] || !textEl) return;

  let score = 0;
  if (val.length >= 8)               score++;
  if (/[A-Z]/.test(val))             score++;
  if (/[0-9]/.test(val))             score++;
  if (/[^A-Za-z0-9]/.test(val))      score++;

  const colors  = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-accent'];
  const labels  = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const txtCols = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-accent'];

  bars.forEach((b, i) => {
    b.className = `h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-dark-border'}`;
  });
  textEl.className = `text-xs ${score > 0 ? txtCols[score - 1] : 'text-gray-500'}`;
  textEl.textContent = score > 0 ? `Độ mạnh: ${labels[score]}` : 'Nhập mật khẩu để kiểm tra độ mạnh';
}

/* ================================================================
   10. DASHBOARD SIDEBAR TOGGLE
   ================================================================ */
function toggleSidebar() {
  const sb      = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sb) return;
  sb.classList.toggle('open');
  overlay?.classList.toggle('hidden');
}

function initDashboard() {
  const openBtn  = $('#sidebarOpen');
  const closeBtn = $('#sidebarToggle');
  const overlay  = $('#sidebarOverlay');

  openBtn?.addEventListener('click',  toggleSidebar);
  closeBtn?.addEventListener('click', toggleSidebar);
  overlay?.addEventListener('click',  toggleSidebar);

  // Sidebar nav links – update page title
  $$('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const title = link.querySelector('.sidebar-text')?.textContent?.trim() || '';
      const pageTitle = $('#pageTitle');
      if (pageTitle) pageTitle.textContent = title;
      // Close mobile sidebar
      const sb = $('#sidebar');
      if (sb && sb.classList.contains('open')) toggleSidebar();
    });
  });

  // Chart tabs
  $$('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

/* ================================================================
   11. INTERSECTION OBSERVER – animate on scroll
   ================================================================ */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  $$('.product-card, .feature-card, .category-card, .kpi-card, .dash-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initLangDropdown();
  initNavbar();
  initMobileMenu();
  initCountdown();
  initDashboard();
  setTimeout(initScrollAnimations, 100); // slight delay to avoid flash
});
