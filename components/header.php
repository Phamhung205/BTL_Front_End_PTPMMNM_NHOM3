<?php
/**
 * Header Component - Translation Manager
 * Chứa doctype, meta, title, Tailwind CDN, app.css
 */
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Translation Manager - Hệ thống quản lý bản dịch">
    <title><?php echo htmlspecialchars($pageTitle ?? 'Translation Manager', ENT_QUOTES, 'UTF-8'); ?> - Translation Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="<?php echo $baseUrl ?? ''; ?>assets/css/app.css">
</head>
