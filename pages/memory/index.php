<?php
$projectId = $_GET['project_id'] ?? '';
$query = is_string($projectId) && preg_match('/^[1-9][0-9]*$/D', $projectId)
    ? '?project_id=' . rawurlencode($projectId)
    : '';
header('Location: ../translations/index.php' . $query . '#translation-memory-pane', true, 302);
exit;
