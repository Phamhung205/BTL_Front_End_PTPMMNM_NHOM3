/**
 * Authentication Module - Translation Manager
 * Xử lý Login & Register
 * 
 * KHÔNG lưu password vào localStorage/sessionStorage.
 * JWT chỉ lưu ở sessionStorage ('auth_token') để gọi API, xóa khi đăng xuất.
 * KHÔNG console.log password/token.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

/**
 * Xử lý Login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearFieldErrors();
    hideElement('login-error');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validation
    let hasError = false;

    if (!email) {
        showFieldError('email-error', 'Vui lòng nhập email.');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showFieldError('email-error', 'Email không đúng định dạng.');
        hasError = true;
    }

    if (!password) {
        showFieldError('password-error', 'Vui lòng nhập mật khẩu.');
        hasError = true;
    }

    if (hasError) return;

    // Show loading
    setButtonLoading('login-btn', 'login-btn-text', 'login-btn-loading', true);

    // Call API
    const result = await apiPost('/api/auth/login', { email, password });

    // Clear password from memory
    document.getElementById('password').value = '';

    if (result.success) {
        // Lưu JWT (sessionStorage, mất khi đóng tab) để api.js gửi header Authorization.
        // KHÔNG lưu password.
        if (result.data) {
            if (result.data.token) sessionStorage.setItem('auth_token', result.data.token);
            const userData = {
                id: result.data.userId || null,
                name: result.data.displayName || result.data.fullName || result.data.name || result.data.userName || '',
                email: result.data.email || email
            };
            sessionStorage.setItem('user_display', JSON.stringify(userData));
        }
        window.location.href = 'dashboard.php';
    } else {
        showElement('login-error');
        setTextContent('login-error-text', result.message || 'Đăng nhập thất bại.');
        setButtonLoading('login-btn', 'login-btn-text', 'login-btn-loading', false);
    }
}

/**
 * Xử lý Register
 */
async function handleRegister(e) {
    e.preventDefault();

    // Clear previous errors
    clearFieldErrors();
    hideElement('register-error');
    hideElement('register-success');

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    let hasError = false;

    if (!fullName) {
        showFieldError('fullName-error', 'Vui lòng nhập họ và tên.');
        hasError = true;
    }

    if (!email) {
        showFieldError('email-error', 'Vui lòng nhập email.');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showFieldError('email-error', 'Email không đúng định dạng.');
        hasError = true;
    }

    if (!password) {
        showFieldError('password-error', 'Vui lòng nhập mật khẩu.');
        hasError = true;
    } else if (password.length < 6) {
        showFieldError('password-error', 'Mật khẩu phải có ít nhất 6 ký tự.');
        hasError = true;
    }

    if (!confirmPassword) {
        showFieldError('confirmPassword-error', 'Vui lòng nhập lại mật khẩu.');
        hasError = true;
    } else if (password !== confirmPassword) {
        showFieldError('confirmPassword-error', 'Mật khẩu nhập lại không khớp.');
        hasError = true;
    }

    if (hasError) return;

    // Show loading
    setButtonLoading('register-btn', 'register-btn-text', 'register-btn-loading', true);

    // Call API
    // Backend (RegisterRequest) nhận trường displayName
    const result = await apiPost('/api/auth/register', {
        displayName: fullName,
        email: email,
        password: password
    });

    // Clear passwords from memory
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';

    if (result.success) {
        showElement('register-success');
        setTextContent('register-success-text', 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
        
        setTimeout(function() {
            window.location.href = 'login.php';
        }, 2000);
    } else {
        showElement('register-error');
        let errorMsg = result.message || 'Đăng ký thất bại.';
        // Hiển thị validation errors nếu có
        if (result.errors && typeof result.errors === 'object') {
            const errorMessages = [];
            for (const key in result.errors) {
                if (Array.isArray(result.errors[key])) {
                    errorMessages.push(...result.errors[key]);
                } else {
                    errorMessages.push(result.errors[key]);
                }
            }
            if (errorMessages.length > 0) {
                errorMsg = errorMessages.join(' ');
            }
        }
        setTextContent('register-error-text', errorMsg);
        setButtonLoading('register-btn', 'register-btn-text', 'register-btn-loading', false);
    }
}

// === Helper Functions ===

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function clearFieldErrors() {
    const errors = document.querySelectorAll('[id$="-error"]');
    errors.forEach(function(el) {
        if (el.tagName === 'P') {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setButtonLoading(btnId, textId, loadingId, isLoading) {
    const btn = document.getElementById(btnId);
    const textEl = document.getElementById(textId);
    const loadingEl = document.getElementById(loadingId);
    
    if (btn) btn.disabled = isLoading;
    if (textEl) textEl.classList.toggle('hidden', isLoading);
    if (loadingEl) loadingEl.classList.toggle('hidden', !isLoading);
}
