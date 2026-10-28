<?php
/**
 * Login Page - Translation Manager
 */
require_once __DIR__ . '/config/api.php';
$pageTitle = 'Đăng nhập';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?> - Translation Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/css/app.css">
    <?php include __DIR__ . '/config/frontend.php'; ?>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="w-full max-w-md px-4">
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <!-- Logo & Title -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Translation Manager</h1>
                <p class="text-gray-500 mt-1">Đăng nhập vào tài khoản của bạn</p>
            </div>

            <!-- Error Message -->
            <div id="login-error" class="hidden mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span id="login-error-text" class="text-sm text-red-700"></span>
                </div>
            </div>

            <!-- Login Form -->
            <div id="login-notice" role="status" class="hidden mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"></div>
            <form id="login-form" class="space-y-5" novalidate>
                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" id="email" name="email" required autocomplete="username" aria-describedby="email-error"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="name@example.com">
                    <p id="email-error" class="hidden mt-1 text-sm text-red-600"></p>
                </div>

                <!-- Password -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                    <input type="password" id="password" name="password" required autocomplete="current-password" aria-describedby="password-error"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="••••••••">
                    <p id="password-error" class="hidden mt-1 text-sm text-red-600"></p>
                </div>

                <!-- Remember Me -->
                <div class="flex items-center justify-between">
                    <label class="flex items-center">
                        <input type="checkbox" id="remember" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <span class="ml-2 text-sm text-gray-600">Ghi nhớ email</span>
                    </label>
                </div>

                <!-- Submit Button -->
                <button type="submit" id="login-btn"
                    class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span id="login-btn-text">Đăng nhập</span>
                    <span id="login-btn-loading" class="hidden inline-flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Đang xử lý...
                    </span>
                </button>
            </form>
            <p id="auth-mode-note" class="mt-4 text-xs text-gray-500" role="status"></p>

            <!-- Register Link -->
            <p class="mt-6 text-center text-sm text-gray-600">
                Chưa có tài khoản?
                <a href="register.php" class="text-indigo-600 hover:text-indigo-500 font-medium">Đăng ký ngay</a>
            </p>
        </div>

        <!-- Footer -->
        <p class="mt-4 text-center text-xs text-gray-400">
            &copy; 2026 Translation Manager. Nhóm Phạm Ngọc Hùng.
        </p>
    </div>

    <script src="assets/js/shared/api.js"></script>
    <script src="assets/js/shared/ui.js"></script>
    <script src="assets/js/auth/auth.js"></script>
</body>
</html>
