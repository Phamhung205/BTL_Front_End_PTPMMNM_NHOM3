<?php
// Bộ định tuyến PHP built-in server: chỉ phục vụ các trang/asset công khai.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$publicPages = ['/', '/index.php', '/login.php', '/register.php', '/dashboard.php', '/logout.php', '/gateway.php',
    '/pages/projects/index.php', '/pages/projects/create.php', '/pages/projects/detail.php', '/pages/members/index.php',
    '/pages/languages/index.php', '/pages/source-versions/index.php', '/pages/translation-keys/index.php',
    '/pages/translations/index.php', '/pages/reviews/index.php', '/pages/releases/index.php', '/pages/history/index.php', '/pages/admin/index.php',
    '/pages/consumer/index.php', '/pages/help/index.php'];
$asset = preg_match('~^/assets/(css|js|images)/[a-zA-Z0-9_./-]+\.(css|js|png|jpg|jpeg|svg|webp|ico)$~', $path)
    && !str_contains($path, '..');
$sample = in_array($path, ['/examples/website/index.html','/examples/website/app.js','/examples/website/style.css','/examples/website/release.json'], true)
    || preg_match('~^/examples/website/locales/(?:en|vi|zh)\.json$~D', $path);
if (!in_array($path, $publicPages, true) && !$asset && !$sample) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Không tìm thấy trang.';
    return true;
}
return false;
