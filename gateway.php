<?php

require_once __DIR__ . '/config/api.php';

header('Content-Type: application/json; charset=UTF-8');

function gateway_reply(int $status, mixed $body = null): never
{
    http_response_code($status);

    if ($status !== 204) {
        echo json_encode(
            $body,
            JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
    }

    exit;
}

// Chỉ cho phép POST đến PHP Gateway.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    gateway_reply(405);
}

// Bảo vệ CSRF và kiểm tra Origin.
$scheme = isset($_SERVER['HTTPS']) &&
    $_SERVER['HTTPS'] !== 'off'
        ? 'https'
        : 'http';

$expectedOrigin = $scheme . '://' .
    ($_SERVER['HTTP_HOST'] ?? '');

if (
    ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site' ||
    (
        isset($_SERVER['HTTP_ORIGIN']) &&
        $_SERVER['HTTP_ORIGIN'] !== $expectedOrigin
    ) ||
    !hash_equals(
        $_SESSION['csrf'],
        $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''
    )
) {
    gateway_reply(403);
}

// Chỉ nhận nội dung JSON.
if (
    !str_starts_with(
        strtolower($_SERVER['CONTENT_TYPE'] ?? ''),
        'application/json'
    )
) {
    gateway_reply(415);
}

// Giới hạn kích thước request.
$maxRequestBytes = 4 * 1024 * 1024 + 8192;

$raw = file_get_contents(
    'php://input',
    false,
    null,
    0,
    $maxRequestBytes + 1
);

if ($raw === false || strlen($raw) > $maxRequestBytes) {
    gateway_reply(413);
}

try {
    $request = json_decode(
        $raw,
        true,
        16,
        JSON_THROW_ON_ERROR
    );
} catch (JsonException) {
    gateway_reply(400);
}

if (!is_array($request)) {
    gateway_reply(400);
}

$endpoint = $request['endpoint'] ?? '';
$method = $request['method'] ?? '';

if (!is_string($endpoint) || !is_string($method)) {
    gateway_reply(400);
}

$query = $request['query'] ?? [];

if (!is_array($query)) {
    gateway_reply(400);
}

// Các tham số query được phép.
$queryKeys = match (true) {
    $endpoint === '/api/admin/users/find' => ['email'],
    $endpoint === '/api/translation-memory' => ['locale', 'q', 'page'],
    $endpoint === '/api/admin/users'
        => ['q', 'role', 'status', 'page'],

    in_array(
        $endpoint,
        ['/api/admin/projects', '/api/admin/audit'],
        true
    ) => ['q', 'page'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations$~D',
        $endpoint
    ) === 1 => ['locale', 'q', 'status', 'assignee'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/activity$~D',
        $endpoint
    ) === 1 => ['page'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translation-keys$~D',
        $endpoint
    ) === 1 => ['q', 'status'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/source-versions/[1-9][0-9]*/changes$~D',
        $endpoint
    ) === 1 => ['compareToVersionId'],

    default => [],
};

// Kiểm tra query.
foreach ($query as $key => $value) {
    if (
        !in_array($key, $queryKeys, true) ||
        !is_string($value) ||
        strlen($value) > 2000
    ) {
        gateway_reply(400);
    }

    if ($key === 'email' && (strlen($value) > 190 || $value === '')) {
        gateway_reply(400);
    }

    if (
        $key === 'compareToVersionId' &&
        preg_match('~^[1-9][0-9]*$~D', $value) !== 1
    ) {
        gateway_reply(400);
    }

    if ($key === 'status') {
        $statuses = $endpoint === '/api/admin/users'
            ? ['', 'active', 'locked']
            : (
                str_ends_with($endpoint, '/translations')
                    ? [
                        '',
                        'missing',
                        'draft',
                        'translated',
                        'needs_review',
                        'approved'
                    ]
                    : ['all', 'active', 'deleted']
            );

        if (!in_array($value, $statuses, true)) {
            gateway_reply(400);
        }
    }

    if (
        $key === 'role' &&
        !in_array($value, ['', 'user', 'admin'], true)
    ) {
        gateway_reply(400);
    }

    if (
        $key === 'page' &&
        preg_match('~^[1-9][0-9]{0,5}$~D', $value) !== 1
    ) {
        gateway_reply(400);
    }

    if (
        $key === 'locale' &&
        preg_match(
            '~^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$~D',
            $value
        ) !== 1
    ) {
        gateway_reply(400);
    }

    if (
        $key === 'assignee' &&
        $value !== '' &&
        !in_array($value, ['me', 'none'], true) &&
        preg_match('~^[1-9][0-9]*$~D', $value) !== 1
    ) {
        gateway_reply(400);
    }
}

// Danh sách endpoint và phương thức được phép.
$allowed = match (true) {
    in_array($endpoint, ['/api/auth/me', '/api/auth/permissions', '/api/admin/roles', '/api/admin/permissions', '/api/admin/users/find'], true) => ['GET'],
    in_array($endpoint, ['/api/translation-memory', '/api/translation-memory/languages'], true) => ['GET'],
    $endpoint === '/api/admin/users' => ['GET', 'POST'],
    preg_match('~^/api/admin/users/[1-9][0-9]*/(?:role|status)$~D', $endpoint) === 1 => ['PUT'],
    preg_match('~^/api/admin/users/[1-9][0-9]*/permissions$~D', $endpoint) === 1 => ['GET'],
    preg_match('~^/api/projects/[1-9][0-9]*/permissions$~D', $endpoint) === 1 => ['GET'],

    in_array(
        $endpoint,
        [
            '/api/admin/stats',
            '/api/admin/users',
            '/api/admin/projects',
            '/api/admin/audit'
        ],
        true
    ) => ['GET'],

    preg_match(
        '~^/api/admin/users/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['GET', 'PUT'],

    preg_match(
        '~^/api/admin/projects/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['PUT', 'DELETE'],

    preg_match(
        '~^/api/admin/projects/[1-9][0-9]*/members$~D',
        $endpoint
    ) === 1 => ['GET', 'POST'],

    preg_match(
        '~^/api/admin/projects/[1-9][0-9]*/members/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['PUT', 'DELETE'],

    $endpoint === '/api/dashboard/stats' => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/activity$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations$~D',
        $endpoint
    ) === 1 => ['GET', 'POST', 'DELETE'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/create-missing$~D',
        $endpoint
    ) === 1 => ['POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/approve$~D',
        $endpoint
    ) === 1 => ['POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['DELETE'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/stats$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/(?:[1-9][0-9]*/)?assign$~D',
        $endpoint
    ) === 1 => ['PUT'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/[1-9][0-9]*/comments$~D',
        $endpoint
    ) === 1 => ['GET', 'POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/[1-9][0-9]*/history$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations/[1-9][0-9]*/(?:approve|reject)$~D',
        $endpoint
    ) === 1 => ['POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/releases$~D',
        $endpoint
    ) === 1 => ['GET', 'POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/releases/(?:validate|report|[1-9][0-9]*)$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/releases/[1-9][0-9]*/api-key$~D',
        $endpoint
    ) === 1 => ['POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/releases/[1-9][0-9]*/(?:download|integration|files/[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$~D',
        $endpoint
    ) === 1 => ['GET'],

    in_array(
        $endpoint,
        [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/logout'
        ],
        true
    ) => ['POST'],

    $endpoint === '/api/projects' => ['GET', 'POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/members/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['PUT', 'DELETE'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/members$~D',
        $endpoint
    ) === 1 => ['GET', 'POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/locales$~D',
        $endpoint
    ) === 1 => ['GET', 'POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/locales/[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$~D',
        $endpoint
    ) === 1 => ['PUT', 'DELETE'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/source-versions$~D',
        $endpoint
    ) === 1 => ['GET'],

    // Endpoint nhập toàn bộ JSON nguồn.
    preg_match(
        '~^/api/projects/[1-9][0-9]*/source-versions/import$~D',
        $endpoint
    ) === 1 => ['POST'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/source-versions/[1-9][0-9]*/changes$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*/translation-keys$~D',
        $endpoint
    ) === 1 => ['GET'],

    preg_match(
        '~^/api/projects/[1-9][0-9]*$~D',
        $endpoint
    ) === 1 => ['PUT', 'DELETE'],

    default => [],
};

if (!in_array($method, $allowed, true)) {
    gateway_reply(400);
}

if ($query && $method !== 'GET') {
    gateway_reply(400);
}

// Đăng xuất.
if ($endpoint === '/api/auth/logout') {
    $_SESSION = [];
    session_destroy();

    setcookie(
        session_name(),
        '',
        [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => $scheme === 'https',
            'httponly' => true,
            'samesite' => 'Lax'
        ]
    );

    gateway_reply(204);
}

// Lấy JWT từ PHP session.
$authRequest = in_array(
    $endpoint,
    ['/api/auth/login', '/api/auth/register'],
    true
);

if (!$authRequest && empty($_SESSION['backend_jwt'])) {
    gateway_reply(401);
}

if (!extension_loaded('curl')) {
    gateway_reply(503);
}

$headers = ['Accept: application/json'];

if (!$authRequest) {
    $headers[] =
        'Authorization: Bearer ' . $_SESSION['backend_jwt'];
}

$queryString = $query
    ? '?' . http_build_query(
        $query,
        '',
        '&',
        PHP_QUERY_RFC3986
    )
    : '';

// Xác định request tải gói ngôn ngữ.
$download = preg_match(
    '~^/api/projects/[1-9][0-9]*/releases/[1-9][0-9]*/(?:download|integration|files/)~',
    $endpoint
) === 1;

$responseHeaders = [];
$responseBody = '';

$maxResponseBytes = $download
    ? 64 * 1024 * 1024
    : 4 * 1024 * 1024;

// Gửi request đến Backend .NET.
$curl = curl_init(
    API_BASE_URL . $endpoint . $queryString
);

$curlOptions = [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_MAXFILESIZE => $maxResponseBytes,

    CURLOPT_HEADERFUNCTION => function ($curl, $line)
        use (&$responseHeaders) {

        if (str_contains($line, ':')) {
            [$key, $value] = explode(':', $line, 2);

            $responseHeaders[
                strtolower(trim($key))
            ] = trim($value);
        }

        return strlen($line);
    },

    CURLOPT_WRITEFUNCTION => function ($curl, $chunk)
        use (&$responseBody, $maxResponseBytes) {

        if (
            strlen($responseBody) + strlen($chunk) >
            $maxResponseBytes
        ) {
            return 0;
        }

        $responseBody .= $chunk;

        return strlen($chunk);
    }
];

// Một số yêu cầu DELETE có body.
$translationDelete =
    $method === 'DELETE' &&
    preg_match(
        '~^/api/projects/[1-9][0-9]*/translations(?:/[1-9][0-9]*)?$~D',
        $endpoint
    ) === 1;

if (
    in_array($method, ['POST', 'PUT'], true) ||
    $translationDelete
) {
    if (
        !isset($request['body']) ||
        !is_array($request['body'])
    ) {
        gateway_reply(400);
    }

    $headers[] = 'Content-Type: application/json';

    $curlOptions[CURLOPT_POSTFIELDS] = json_encode(
        $request['body'],
        JSON_UNESCAPED_UNICODE
    );
}

// Thực hiện HTTP request.
$curlOptions[CURLOPT_HTTPHEADER] = $headers;

curl_setopt_array($curl, $curlOptions);

$completed = curl_exec($curl);
$response = $responseBody;

$status = (int) curl_getinfo(
    $curl,
    CURLINFO_RESPONSE_CODE
);

curl_close($curl);

if ($completed === false || $status < 100) {
    gateway_reply(502);
}

// Xử lý thông báo lỗi từ Backend.
if ($status >= 400) {
    if ($status === 401 && !$authRequest) {
        unset($_SESSION['backend_jwt']);
    }

    $error = json_decode($response, true);

    $safe = [];

    if (
        ($error['details']['code'] ?? '') === 'last_manager'
    ) {
        $safe['code'] = 'last_manager';
    }

    // SỬA: Cho phép chuyển tiếp thông báo lỗi nhập nguồn.
    // Không chuyển tiếp lỗi máy chủ 500 hoặc stack trace.
    $isSourceImport =
        $method === 'POST' &&
        preg_match(
            '~^/api/projects/[1-9][0-9]*/source-versions/import$~D',
            $endpoint
        ) === 1;

    $allowBusinessError =
        str_starts_with($endpoint, '/api/admin/') ||
        preg_match(
            '~/(?:translations|releases)(?:/|$)~',
            $endpoint
        ) === 1 ||
        $isSourceImport ||
        ($method === 'POST' && $endpoint === '/api/projects');

    if ($status < 500 && $allowBusinessError) {
        if (is_string($error['message'] ?? null)) {
            $safe['message'] = mb_substr(
                $error['message'],
                0,
                2000
            );
        }

        if (is_array($error['details'] ?? null)) {
            $safe['details'] = array_intersect_key(
                $error['details'],
                array_flip([
                    'currentRowVersion',
                    'currentValue',
                    'currentStatus',
                    'updatedBy',
                    'updatedAt',
                    'assignedTo',
                    'assignedToName',
                    'missing',
                    'extra',
                    'expected',
                    'actual',
                    'problems'
                ])
            );
        }
    }

    gateway_reply(
        $status,
        $safe ?: null
    );
}

// Tải gói JSON hoặc ZIP đã phát hành.
if ($download && $status === 200) {
    $zip = str_ends_with(
        $endpoint,
        '/download'
    );

    header(
        'Content-Type: ' .
        (
            $zip
                ? 'application/zip'
                : 'application/json; charset=utf-8'
        )
    );

    $name = $zip
        ? 'release.zip'
        : 'translation.json';

    if (
        preg_match(
            '/filename="?([A-Za-z0-9_.-]+)"?(?:;|$)/i',
            $responseHeaders['content-disposition'] ?? '',
            $match
        )
    ) {
        $name = $match[1];
    }

    header(
        'Content-Disposition: attachment; filename="' .
        $name . '"'
    );

    $sha = $responseHeaders['x-content-sha256'] ?? '';

    if (preg_match('/^[a-f0-9]{64}$/iD', $sha)) {
        header('X-Content-SHA256: ' . $sha);
    }

    echo $response;
    exit;
}

if ($status === 204) {
    gateway_reply(204);
}

try {
    $data = json_decode(
        $response,
        true,
        128,
        JSON_THROW_ON_ERROR
    );
} catch (JsonException) {
    gateway_reply(502);
}

// Không gửi JWT về cho JavaScript.
if ($authRequest) {
    if (
        !is_array($data) ||
        !is_string($data['token'] ?? null) ||
        $data['token'] === ''
    ) {
        gateway_reply(502);
    }

    if ($endpoint === '/api/auth/login') {
        session_regenerate_id(true);

        $_SESSION['backend_jwt'] =
            $data['token'];
    }

    unset($data['token']);
}

gateway_reply($status, $data);
