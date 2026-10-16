<?php
/**
 * API Configuration
 * Translation Manager Frontend
 * 
 * Cấu hình URL Backend API.
 * Chỉ chứa API Base URL, KHÔNG chứa secret.
 */

// API Base URL - Backend C# ASP.NET Core
define('API_BASE_URL', 'http://localhost:5000');

// API Endpoints
define('API_ENDPOINTS', [
    'login'          => '/api/auth/login',
    'register'       => '/api/auth/register',
    'projects'       => '/api/projects',
    'project_detail' => '/api/projects/{projectId}',
    'members'        => '/api/projects/{projectId}/members',
]);
