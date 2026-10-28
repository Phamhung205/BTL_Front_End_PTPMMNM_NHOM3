<?php
// JWT chỉ tồn tại trong phiên PHP ở server; trình duyệt chỉ giữ cookie HttpOnly.
if (session_status() !== PHP_SESSION_ACTIVE) {
    $sessionDirectory = dirname(__DIR__) . '/.local/sessions';
    if (!is_dir($sessionDirectory) && !mkdir($sessionDirectory, 0700, true) && !is_dir($sessionDirectory)) {
        http_response_code(500);
        exit('Không tạo được thư mục phiên.');
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_save_path($sessionDirectory);
    session_name('tm_frontend_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
