<?php
/**
 * Entry Point - Translation Manager
 * Redirect to login or dashboard
 */
session_start();

// Redirect to dashboard if seems logged in, otherwise to login
header('Location: login.php');
exit;
