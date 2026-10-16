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
    : 'http://localhost:5000';

/**
 * Hàm fetch chung với xử lý lỗi
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function apiFetch(endpoint, options = {}) {
    const url = API_BASE_URL + endpoint;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include' // Gửi cookie authentication
    };

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
        
        // Xử lý 401 - chuyển về login
        if (response.status === 401) {
            window.location.href = getBaseUrl() + 'login.php';
            return { success: false, status: 401, message: 'Phiên đăng nhập đã hết hạn.' };
        }

        // Xử lý 403
        if (response.status === 403) {
            return { success: false, status: 403, message: 'Bạn không có quyền thực hiện chức năng này.' };
        }

        // Xử lý 404
        if (response.status === 404) {
            return { success: false, status: 404, message: 'Không tìm thấy dữ liệu.' };
        }

        // Xử lý 409
        if (response.status === 409) {
            let data = {};
            try { data = await response.json(); } catch(e) {}
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
