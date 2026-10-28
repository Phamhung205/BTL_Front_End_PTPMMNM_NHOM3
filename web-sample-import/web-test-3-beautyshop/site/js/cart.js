/**
 * cart.js – Cart Drawer logic
 * Lumière Beauty
 */

// ── Open / Close Cart Drawer ──────────────────────────────────
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close drawer when pressing Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCart();
});
