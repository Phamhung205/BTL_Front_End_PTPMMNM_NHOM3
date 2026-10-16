<?php
/**
 * Logout - Translation Manager
 * Xóa session và chuyển về trang login
 */
session_start();

// Xóa toàn bộ session
$_SESSION = [];

// Xóa session cookie
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

// Redirect to login
header('Location: login.php?logged_out=1');
exit;
