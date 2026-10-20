/**
 * API Module - Translation Manager
 * Quản lý tất cả HTTP request tới Backend C# ASP.NET Core
 * 
 * KHÔNG chứa secret, token hard-code, hay database credentials.
 * API Base URL được cấu hình tại config/api.php và truyền qua HTML.
 */

// API Base URL - được set từ PHP hoặc mặc định
const API_BASE_URL = (typeof window.__API_BASE_URL !== 'undefined')
    ? window.__API_BASE_URL
    : 'http://localhost:5088';

/**
 * JWT do Backend trả về khi đăng nhập, giữ trong sessionStorage (mất khi đóng tab).
 * Backend xác thực bằng header "Authorization: Bearer <token>", không dùng cookie.
 */
function getAuthToken() {
    try { return sessionStorage.getItem('auth_token'); } catch (e) { return null; }
}

function clearAuth() {
    try {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_display');
    } catch (e) {}
}

async function readJsonSafe(response) {
    try { return await response.json(); } catch (e) { return {}; }
}

/**
 * Hàm fetch chung với xử lý lỗi
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function apiFetch(endpoint, options = {}) {
    const url = API_BASE_URL + endpoint;
    const token = getAuthToken();
    const isAuthEndpoint = endpoint.indexOf('/api/auth/') === 0;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    if (token) defaultOptions.headers['Authorization'] = 'Bearer ' + token;

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(url, mergedOptions);
        
        // Xử lý 401 - chuyển về login (trừ API đăng nhập/đăng ký: hiển thị lỗi "Sai email hoặc mật khẩu")
        if (response.status === 401) {
            if (isAuthEndpoint) {
                const data = await readJsonSafe(response);
                return { success: false, status: 401, message: data.message || 'Sai email hoặc mật khẩu.', data };
            }
            clearAuth();
            window.location.href = getBaseUrl() + 'login.php';
            return { success: false, status: 401, message: 'Phiên đăng nhập đã hết hạn.' };
        }

        // Xử lý 403 - ưu tiên thông báo cụ thể từ Backend
        if (response.status === 403) {
            const data = await readJsonSafe(response);
            return { success: false, status: 403, message: data.message || 'Bạn không có quyền thực hiện chức năng này.', data };
        }

        // Xử lý 404
        if (response.status === 404) {
            const data = await readJsonSafe(response);
            return { success: false, status: 404, message: data.message || 'Không tìm thấy dữ liệu.', data };
        }

        // Xử lý 409 - trùng dữ liệu hoặc xung đột phiên bản (row_version)
        if (response.status === 409) {
            const data = await readJsonSafe(response);
            return { success: false, status: 409, message: data.message || 'Dữ liệu bị trùng lặp.', data };
        }

        // Xử lý 429
        if (response.status === 429) {
            return { success: false, status: 429, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' };
        }

        // Xử lý 500+
        if (response.status >= 500) {
            return { success: false, status: response.status, message: 'Có lỗi xảy ra. Vui lòng thử lại.' };
        }

        // Xử lý 400, 422 - validation errors
        if (response.status === 400 || response.status === 422) {
            let data = {};
            try { data = await response.json(); } catch(e) {}
            return { 
                success: false, 
                status: response.status, 
                message: data.message || data.title || 'Dữ liệu không hợp lệ.',
                errors: data.errors || {},
                data 
            };
        }

        // Success (200, 201, 204)
        if (response.status === 204) {
            return { success: true, status: 204, data: null };
        }

        let data = {};
        try { data = await response.json(); } catch(e) {}
        return { success: true, status: response.status, data };

    } catch (error) {
        // Network error - KHÔNG hiển thị chi tiết lỗi nội bộ
        return { 
            success: false, 
            status: 0, 
            message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.' 
        };
    }
}

/**
 * GET request
 */
async function apiGet(endpoint) {
    return apiFetch(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
async function apiPost(endpoint, body) {
    return apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

/**
 * PUT request
 */
async function apiPut(endpoint, body) {
    return apiFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

/**
 * PATCH request
 */
async function apiPatch(endpoint, body) {
    return apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body)
    });
}

/**
 * DELETE request
 */
async function apiDelete(endpoint) {
    return apiFetch(endpoint, { method: 'DELETE' });
}

/**
 * GET trả về Response thô (dùng cho tải file / xem nội dung JSON gốc).
 * @returns {Promise<{success: boolean, status: number, response?: Response, message?: string}>}
 */
async function apiFetchRaw(endpoint) {
    const token = getAuthToken();
    try {
        const response = await fetch(API_BASE_URL + endpoint, {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (response.status === 401) {
            clearAuth();
            window.location.href = getBaseUrl() + 'login.php';
            return { success: false, status: 401, message: 'Phiên đăng nhập đã hết hạn.' };
        }
        if (!response.ok) {
            const data = await readJsonSafe(response);
            return { success: false, status: response.status, message: data.message || 'Không tải được dữ liệu.', data };
        }
        return { success: true, status: response.status, response };
    } catch (error) {
        return { success: false, status: 0, message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.' };
    }
}

/**
 * Tải file có xác thực JWT (thẻ <a href> thường không gửi được header Authorization).
 */
async function apiDownload(endpoint, fallbackFileName) {
    const result = await apiFetchRaw(endpoint);
    if (!result.success) return result;

    const blob = await result.response.blob();
    const fileName = parseContentDispositionFileName(result.response.headers.get('Content-Disposition')) || fallbackFileName || 'download';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

    return { success: true, status: result.status, fileName, sha256: result.response.headers.get('X-Content-SHA256') };
}

function parseContentDispositionFileName(header) {
    if (!header) return null;
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (star) {
        try { return decodeURIComponent(star[1]); } catch (e) {}
    }
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain ? plain[1] : null;
}

/**
 * Lấy base URL cho navigation
 */
function getBaseUrl() {
    const path = window.location.pathname;
    // Nếu đang ở trong pages/ subfolder, cần quay lại root
    if (path.includes('/pages/')) {
        const parts = path.split('/pages/');
        return parts[0] + '/';
    }
    // Nếu ở root
    const lastSlash = path.lastIndexOf('/');
    return path.substring(0, lastSlash + 1);
}
