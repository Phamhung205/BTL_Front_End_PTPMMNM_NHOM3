<?php
$projectId = $_GET['project_id'] ?? '';
if (is_string($projectId) && $projectId !== '') {
    header('Location: ../projects/detail.php?id=' . rawurlencode($projectId) . '#members');
} else {
    header('Location: ../projects/index.php');
}
exit;
