<?php
/**
 * Members Page - Translation Manager
 * Redirect to project detail members tab
 */
session_start();

$projectId = isset($_GET['project_id']) ? $_GET['project_id'] : '';
if ($projectId) {
    header('Location: ../projects/detail.php?id=' . urlencode($projectId) . '#members');
} else {
    header('Location: ../projects/index.php');
}
exit;
