
/** Giao tiếp HTTP thông qua PHP Gateway. Không lưu JWT/password trên trình duyệt. */

const APP_CONFIG = window.APP_CONFIG;
let redirecting = false;

window.addEventListener?.('pageshow', event => {
    if (event.persisted) location.reload();
});

function getBaseUrl() {
    const path = location.pathname;

    return path.includes('/pages/')
        ? path.split('/pages/')[0] + '/'
        : path.slice(0, path.lastIndexOf('/') + 1);
}

function apiEndpoint(name, projectId, userId) {
    const endpoint = APP_CONFIG.endpoints[name];

    if (
        typeof endpoint !== 'string' ||
        !endpoint.startsWith('/') ||
        endpoint.startsWith('//') ||
        /[?#\\]/.test(endpoint)
    ) {
        return '';
    }

    if (
        (
            endpoint.includes('{projectId}') &&
            (projectId == null || projectId === '')
        ) ||
        (
            endpoint.includes('{userId}') &&
            (userId == null || userId === '')
        )
    ) {
        return '';
    }

    return endpoint
        .replace('{projectId}', encodeURIComponent(projectId ?? ''))
        .replace('{userId}', encodeURIComponent(userId ?? ''));
}

function clearUserDisplay() {
    try {
        sessionStorage.removeItem('user_display');
    } catch (_) {}
}

function apiFailure(status) {
    const messages = {
        400: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường đã nhập.',
        401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        403: 'Bạn không có quyền thực hiện chức năng này.',
        404: 'Không tìm thấy dữ liệu.',
        409: 'Dữ liệu bị trùng hoặc đã được thay đổi. Vui lòng kiểm tra lại.',
        413: 'Tệp JSON nguồn vượt quá giới hạn 2 MB.',
        422: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường đã nhập.',
        429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
    };

    return {
        success: false,
        status,
        message: messages[status] ||
            'Có lỗi xảy ra. Vui lòng thử lại.'
    };
}

function handleUnauthorized(result, options) {
    if (
        result.status === 401 &&
        !options.authRequest &&
        !options.noRedirect
    ) {
        clearUserDisplay();

        if (!redirecting) {
            redirecting = true;

            location.replace(
                getBaseUrl() + 'login.php?expired=1'
            );
        }
    }

    return result;
}

async function apiFetch(endpoint, options = {}) {
    if (
        !APP_CONFIG ||
        !endpoint ||
        !endpoint.startsWith('/') ||
        endpoint.startsWith('//') ||
        /[?#\\]/.test(endpoint)
    ) {
        return {
            success: false,
            status: 0,
            message: 'Chức năng chưa được cấu hình endpoint Backend.'
        };
    }

    return apiGatewayFetch(endpoint, options);
}

async function apiGatewayFetch(endpoint, options) {
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        60000
    );

    try {
        const response = await fetch(
            getBaseUrl() + 'gateway.php',
            {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                redirect: 'error',
                signal: controller.signal,

                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': APP_CONFIG.csrfToken
                },

                body: JSON.stringify({
                    endpoint,
                    method: options.method || 'GET',

                    ...(options.query
                        ? { query: options.query }
                        : {}),

                    ...(options.body === undefined
                        ? {}
                        : { body: JSON.parse(options.body) })
                })
            }
        );

        if (!response.ok) {
            const result = apiFailure(response.status);

            const error = await response.json()
                .catch(() => null);

            // Hiển thị lỗi nghiệp vụ từ các API được phép.
            // Bao gồm chức năng nhập phiên bản nguồn.

            const allowBackendMessage =
                endpoint.startsWith('/api/admin/') ||

                /\/projects\/[1-9][0-9]*\/(translations|releases)(\/|$)/
                    .test(endpoint) ||

                (
                    options.method === 'POST' &&
                    /\/projects\/[1-9][0-9]*\/source-versions\/import$/
                        .test(endpoint)
                );

            if (allowBackendMessage) {
                if (typeof error?.message === 'string') {
                    result.message = error.message;
                }

                if (
                    error?.details &&
                    typeof error.details === 'object'
                ) {
                    result.details = error.details;
                }
            }

            if (
                response.status === 401 &&
                options.authRequest
            ) {
                result.message = 'Email hoặc mật khẩu không đúng.';
            }

            if (response.status === 409) {
                if (error?.code === 'last_manager') {
                    result.message =
                        'Dự án cần ít nhất một Manager. ' +
                        'Hãy cấp quyền Manager cho người khác trước.';
                }
            }

            return handleUnauthorized(result, options);
        }

        // Xử lý tải xuống.
        if (options.download) {
            return {
                success: true,
                status: response.status,
                data: await response.blob(),

                filename: response.headers
                    .get('Content-Disposition')
                    ?.match(/filename="?([A-Za-z0-9_.-]+)/i)?.[1],

                sha256: response.headers
                    .get('X-Content-SHA256')
            };
        }

        return {
            success: true,
            status: response.status,

            data: response.status === 204
                ? null
                : await response.json()
        };

    } catch (_) {
        return {
            success: false,
            status: 0,
            message:
                'Không thể kết nối tới máy chủ hoặc phản hồi không hợp lệ. Vui lòng thử lại.'
        };
    } finally {
        clearTimeout(timeout);
    }
}

function apiGet(endpoint, options = {}) {
    return apiFetch(endpoint, {
        ...options,
        method: 'GET'
    });
}

function apiPost(endpoint, body, options = {}) {
    return apiFetch(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body)
    });
}

function apiPut(endpoint, body, options = {}) {
    return apiFetch(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

function apiDelete(endpoint, options = {}) {
    return apiFetch(endpoint, {
        ...options,
        method: 'DELETE'
    });
}

function apiCollection(payload) {
    const valid = items =>
        items.every(
            item =>
                item &&
                typeof item === 'object' &&
                !Array.isArray(item)
        )
            ? items
            : null;

    if (Array.isArray(payload)) {
        return valid(payload);
    }

    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.items)) {
            return valid(payload.items);
        }

        if (Array.isArray(payload.data)) {
            return valid(payload.data);
        }

        if (
            payload.data &&
            Array.isArray(payload.data.items)
        ) {
            return valid(payload.data.items);
        }
    }

    return null;
}
