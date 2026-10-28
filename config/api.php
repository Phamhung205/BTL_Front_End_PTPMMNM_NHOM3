<?php
// Chỉ cấu hình giao diện. Không kết nối database hoặc xác thực bằng PHP.
$localEnvironment = [];
foreach (['.env', '.env.local'] as $environmentFile) {
    $path = dirname(__DIR__) . '/' . $environmentFile;
    if (!is_readable($path)) continue;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $localEnvironment[trim($key)] = trim(trim($value), "\"'");
    }
}
function frontend_env(string $key, string $default = ''): string {
    global $localEnvironment;
    $value = getenv($key);
    return $value !== false ? $value : ($localEnvironment[$key] ?? $default);
}
$apiUrl = rtrim(frontend_env('API_BASE_URL', 'http://127.0.0.1:5088'), '/');
$apiParts = parse_url($apiUrl);
if (!$apiParts || !in_array($apiParts['scheme'] ?? '', ['http', 'https'], true)
    || empty($apiParts['host']) || isset($apiParts['user']) || isset($apiParts['pass'])
    || isset($apiParts['query']) || isset($apiParts['fragment'])
    || (($apiParts['scheme'] ?? '') === 'http' && !in_array($apiParts['host'], ['localhost', '127.0.0.1', '[::1]'], true))) {
    http_response_code(500);
    exit('Cấu hình địa chỉ API không hợp lệ.');
}
define('API_BASE_URL', $apiUrl);
define('API_ENDPOINTS', [
    'login' => '/api/auth/login',
    'me' => '/api/auth/me',
    'myPermissions' => '/api/auth/permissions',
    'projectPermissions' => '/api/projects/{projectId}/permissions',
    'adminStats' => '/api/admin/stats',
    'adminUsers' => '/api/admin/users',
    'adminProjects' => '/api/admin/projects',
    'adminAudit' => '/api/admin/audit',
    'adminRoles' => '/api/admin/roles',
    'adminPermissions' => '/api/admin/permissions',
    'adminFindUser' => '/api/admin/users/find',
    'register' => '/api/auth/register',
    'projects' => '/api/projects',
    'project' => '/api/projects/{projectId}',
    'members' => '/api/projects/{projectId}/members',
    'member' => '/api/projects/{projectId}/members/{userId}',
    'locales' => '/api/projects/{projectId}/locales',
    'sourceVersions' => '/api/projects/{projectId}/source-versions',
    'translationKeys' => '/api/projects/{projectId}/translation-keys',
    'translations' => '/api/projects/{projectId}/translations',
    'translationStats' => '/api/projects/{projectId}/translations/stats',
    'translationMemory' => '/api/translation-memory',
    'translationMemoryLanguages' => '/api/translation-memory/languages',
    'releases' => '/api/projects/{projectId}/releases',
    'activity' => '/api/projects/{projectId}/activity',
    'dashboardStats' => '/api/dashboard/stats',
    'logout' => '/api/auth/logout', // Kết thúc phiên PHP; Backend JWT không có endpoint revoke.
]);
$frontendConfig = [
    'mode' => 'api',
    'apiBaseUrl' => API_BASE_URL,
    'endpoints' => API_ENDPOINTS,
    'passwordMinLength' => max(1, (int) frontend_env('PASSWORD_MIN_LENGTH', '6')),
    'gateway' => true,
];
require_once __DIR__ . '/session.php';
$frontendConfig['csrfToken'] = $_SESSION['csrf'];
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
