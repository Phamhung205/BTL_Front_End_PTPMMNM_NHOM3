/**
 * UI Module - Translation Manager
 * Xử lý UI chung: sidebar, toast, modal, user menu
 * 
 * KHÔNG console.log sensitive data.
 */

// === Sidebar Toggle ===

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
    }
    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}

// === User Menu ===

function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Close user menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('user-menu');
    const btn = document.getElementById('user-menu-btn');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// === Toast Notifications ===

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };

    const bgColor = colors[type] || colors.info;
    const icon = icons[type] || icons.info;

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${bgColor} transform translate-x-full transition-transform duration-300 min-w-72 max-w-sm`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'flex-shrink-0';
    iconSpan.innerHTML = icon;
    toast.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'text-sm font-medium flex-1';
    textSpan.textContent = message; // textContent for XSS safety
    toast.appendChild(textSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'flex-shrink-0 ml-2 text-white hover:text-gray-200';
    closeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function() {
        toast.classList.remove('translate-x-full');
        toast.classList.add('translate-x-0');
    });

    // Auto remove after 5 seconds
    setTimeout(function() {
        removeToast(toast);
    }, 5000);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('translate-x-0');
    toast.classList.add('translate-x-full');
    setTimeout(function() {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// === Modal ===

function openModal(title, bodyHtml, onConfirm) {
    const backdrop = document.getElementById('modal-backdrop');
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml; // bodyHtml is built by our code, not user input
    
    if (confirmBtn) {
        confirmBtn.onclick = onConfirm;
        confirmBtn.disabled = false;
    }

    if (backdrop) backdrop.classList.remove('hidden');
    if (container) container.classList.remove('hidden');
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const container = document.getElementById('modal-container');
    
    if (backdrop) backdrop.classList.add('hidden');
    if (container) container.classList.add('hidden');
}

// === Confirm Dialog ===

let confirmCallback = null;

function showConfirmDialog(title, message, onConfirm) {
    const backdrop = document.getElementById('confirm-backdrop');
    const dialog = document.getElementById('confirm-dialog');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const actionBtn = document.getElementById('confirm-action-btn');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    confirmCallback = onConfirm;
    if (actionBtn) {
        actionBtn.onclick = function() {
            // Giữ callback trước khi đóng: closeConfirmDialog() đặt confirmCallback = null
            const callback = confirmCallback;
            closeConfirmDialog();
            if (typeof callback === 'function') {
                callback();
            }
        };
    }

    if (backdrop) backdrop.classList.remove('hidden');
    if (dialog) dialog.classList.remove('hidden');
}

function closeConfirmDialog() {
    const backdrop = document.getElementById('confirm-backdrop');
    const dialog = document.getElementById('confirm-dialog');
    
    if (backdrop) backdrop.classList.add('hidden');
    if (dialog) dialog.classList.add('hidden');
    confirmCallback = null;
}

// === Feature Not Available ===

function showFeatureNotAvailable(featureName) {
    showToast('Chức năng "' + featureName + '" đang được thành viên khác phát triển.', 'info');
}

// === Load User Display Info ===

function loadUserDisplay() {
    try {
        const userData = sessionStorage.getItem('user_display');
        if (userData) {
            const user = JSON.parse(userData);
            const name = user.name || 'Người dùng';
            const email = user.email || '';
            const initial = name.charAt(0).toUpperCase();

            // Update navbar
            const navName = document.getElementById('navbar-user-name');
            const navEmail = document.getElementById('navbar-user-email');
            const navAvatar = document.getElementById('navbar-user-avatar');
            const dropName = document.getElementById('dropdown-user-name');
            const dropEmail = document.getElementById('dropdown-user-email');

            if (navName) navName.textContent = name;
            if (navEmail) navEmail.textContent = email;
            if (navAvatar) navAvatar.textContent = initial;
            if (dropName) dropName.textContent = name;
            if (dropEmail) dropEmail.textContent = email;
        }
    } catch(e) {
        // Ignore parse errors
    }
}

// === Init ===

document.addEventListener('DOMContentLoaded', function() {
    loadUserDisplay();
});
