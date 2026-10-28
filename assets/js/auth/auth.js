/** Login / Register; mật khẩu chỉ ở phạm vi request, được xóa khỏi form sau khi gửi. */
document.addEventListener('DOMContentLoaded', () => {
    const login = document.getElementById('login-form');
    const register = document.getElementById('register-form');
    setTextContent('auth-mode-note', 'Xác thực được xử lý bởi Backend C#. Ghi nhớ email không lưu mật khẩu.');
    if (login) {
        login.addEventListener('submit', handleLogin);
        let remembered = '';
        try { remembered = localStorage.getItem('tm_remembered_email') || ''; } catch (_) {}
        document.getElementById('email').value = remembered;
        document.getElementById('remember').checked = Boolean(remembered);
        if (new URLSearchParams(location.search).has('expired')) {
            showElement('login-error');
            setTextContent('login-error-text', 'Vui lòng đăng nhập để tiếp tục.');
        }
        if (new URLSearchParams(location.search).has('registered')) {
            showElement('login-notice');
            setTextContent('login-notice', 'Đăng ký thành công. Bạn có thể đăng nhập.');
        }
        if (new URLSearchParams(location.search).has('logged_out')) {
            showElement('login-notice');
            setTextContent('login-notice', 'Bạn đã đăng xuất.');
        }
    }
    if (register) {
        register.addEventListener('submit', handleRegister);
        document.getElementById('password').placeholder = 'Tối thiểu ' + APP_CONFIG.passwordMinLength + ' ký tự';
    }
});
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function showFieldError(id, message) {
    setTextContent(id, message);
    showElement(id);
    document.querySelector('[aria-describedby="' + id + '"]')?.setAttribute('aria-invalid', 'true');
}
function clearFieldErrors() {
    document.querySelectorAll('p[id$="-error"]').forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
    document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}
function setButtonLoading(btn, text, loading, busy) {
    document.getElementById(btn).disabled = busy;
    document.getElementById(btn).setAttribute('aria-busy', String(busy));
    document.getElementById(text).classList.toggle('hidden', busy);
    document.getElementById(loading).classList.toggle('hidden', !busy);
}
async function handleLogin(event) {
    event.preventDefault();
    if (document.getElementById('login-btn').disabled) return;
    clearFieldErrors();
    hideElement('login-error');
    hideElement('login-notice');
    const email = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password');
    if (!isValidEmail(email)) showFieldError('email-error', 'Vui lòng nhập email hợp lệ.');
    if (!passwordInput.value) showFieldError('password-error', 'Vui lòng nhập mật khẩu.');
    if (!isValidEmail(email) || !passwordInput.value) return;
    setButtonLoading('login-btn', 'login-btn-text', 'login-btn-loading', true);
    const result = await apiPost(apiEndpoint('login'), { email, password: passwordInput.value }, { authRequest: true });
    passwordInput.value = '';
    if (result.success) {
        // Xác nhận phiên proxy PHP có JWT hợp lệ trước khi rời trang.
        const sessionCheck = await apiGet(apiEndpoint('projects'), { noRedirect: true });
        if (!sessionCheck.success) {
            result.success = false;
            result.message = sessionCheck.status === 401
                ? 'Không thiết lập được phiên đăng nhập. Vui lòng đăng nhập lại.'
                : sessionCheck.message;
        }
    }
    if (result.success) {
        const user = result.data?.user || result.data?.data?.user || result.data?.data || result.data || {};
        try {
            sessionStorage.setItem('user_display', JSON.stringify({ id: user.userId ?? user.id, name: user.displayName || user.fullName || user.name || '', email: user.email || email }));
            if (document.getElementById('remember').checked) localStorage.setItem('tm_remembered_email', email);
            else localStorage.removeItem('tm_remembered_email');
        } catch (_) {}
        location.assign(getBaseUrl() + (user.systemRole === 'admin' ? 'pages/admin/index.php' : 'dashboard.php'));
    } else {
        showElement('login-error');
        setTextContent('login-error-text', result.message);
        setButtonLoading('login-btn', 'login-btn-text', 'login-btn-loading', false);
    }
}
async function handleRegister(event) {
    event.preventDefault();
    if (document.getElementById('register-btn').disabled) return;
    clearFieldErrors();
    hideElement('register-error');
    hideElement('register-success');
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirmPassword');
    let valid = true;
    if (fullName.length < 2 || fullName.length > 120) { showFieldError('fullName-error', 'Họ và tên cần từ 2 đến 120 ký tự.'); valid = false; }
    if (!isValidEmail(email)) { showFieldError('email-error', 'Vui lòng nhập email hợp lệ.'); valid = false; }
    if (password.value.length < APP_CONFIG.passwordMinLength) {
        showFieldError('password-error', 'Mật khẩu cần ít nhất ' + APP_CONFIG.passwordMinLength + ' ký tự.'); valid = false;
    }
    if (!confirm.value || password.value !== confirm.value) { showFieldError('confirmPassword-error', 'Mật khẩu nhập lại không khớp.'); valid = false; }
    if (!valid) return;
    setButtonLoading('register-btn', 'register-btn-text', 'register-btn-loading', true);
    const result = await apiPost(apiEndpoint('register'), { displayName: fullName, email, password: password.value }, { authRequest: true });
    password.value = '';
    confirm.value = '';
    if (result.success) {
        showElement('register-success');
        setTextContent('register-success-text', 'Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => location.assign(getBaseUrl() + 'login.php?registered=1'), 600);
    } else {
        showElement('register-error');
        setTextContent('register-error-text', result.message);
        setButtonLoading('register-btn', 'register-btn-text', 'register-btn-loading', false);
    }
}
