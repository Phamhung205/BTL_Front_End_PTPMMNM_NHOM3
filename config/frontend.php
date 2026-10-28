<?php require_once __DIR__ . '/api.php'; ?>
<script>window.APP_CONFIG = <?php echo json_encode($frontendConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>;</script>
