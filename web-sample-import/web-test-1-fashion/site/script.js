// State management
let isLoggedIn = false;
let currentUser = null;

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();

    // Language selector change event (global)
    const globalLanguageSelector = document.getElementById('languageSelector');
    if (globalLanguageSelector) {
        globalLanguageSelector.addEventListener('change', function(e) {
            setLanguage(e.target.value);
            // Sync with dashboard selector
            const dashboardSelector = document.getElementById('dashboardLanguageSelector');
            if (dashboardSelector) {
                dashboardSelector.value = e.target.value;
            }
        });
    }

    // Dashboard language selector change event
    const dashboardLanguageSelector = document.getElementById('dashboardLanguageSelector');
    if (dashboardLanguageSelector) {
        dashboardLanguageSelector.addEventListener('change', function(e) {
            setLanguage(e.target.value);
            // Sync with global selector
            const globalSelector = document.getElementById('languageSelector');
            if (globalSelector) {
                globalSelector.value = e.target.value;
            }
        });
    }

    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        isLoggedIn = true;
        currentUser = JSON.parse(savedUser);
        showPage('dashboardPage');
    }

    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        // Simplified login - just click to login
        login();
    });

    // Register form submission
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });
});

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');

    const globalLanguageSelectorContainer = document.getElementById('globalLanguageSelectorContainer');
    if (globalLanguageSelectorContainer) {
        globalLanguageSelectorContainer.classList.toggle('hidden', pageId === 'dashboardPage');
    }

    // Sync language selectors
    const globalSelector = document.getElementById('languageSelector');
    const dashboardSelector = document.getElementById('dashboardLanguageSelector');

    if (globalSelector && dashboardSelector) {
        globalSelector.value = currentLanguage;
        dashboardSelector.value = currentLanguage;
    }

    // Update language for the new page
    updatePageLanguage();
}

// Login function (simplified for demo)
function login() {
    isLoggedIn = true;
    currentUser = {
        email: document.getElementById('loginEmail').value || 'demo@example.com',
        name: 'Demo User'
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showPage('dashboardPage');
    alert(t('messages.login_success'));
}

// Register function
function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        alert(t('messages.required'));
        return;
    }

    if (password !== confirmPassword) {
        alert(t('messages.password_mismatch'));
        return;
    }

    // For demo, just login after registration
    isLoggedIn = true;
    currentUser = {
        email: email,
        name: name
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showPage('dashboardPage');
    alert(t('messages.register_success'));
}

// Logout function
function logout() {
    isLoggedIn = false;
    currentUser = null;
    localStorage.removeItem('currentUser');
    showPage('loginPage');
    alert(t('messages.logged_out'));
}

// Add to cart function (demo)
function addToCart(productId) {
    alert(t('messages.cart_added'));
}

// Filter products function (demo)
function filterProducts(category) {
    alert(t('messages.filter', { category: t(category === 'all' ? 'allCategories' : category) }));
}
