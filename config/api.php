<?php
/**
 * API Configuration
 * Translation Manager Frontend
 *
 * Cấu hình URL Backend API.
 * Chỉ chứa API Base URL, KHÔNG chứa secret.
 */

// API Base URL - Backend C# ASP.NET Core (dotnet run mặc định cổng 5088, xem launchSettings.json của Backend).
// Có thể ghi đè bằng biến môi trường API_BASE_URL khi deploy.
define('API_BASE_URL', getenv('API_BASE_URL') ?: 'http://localhost:5088');

// API Endpoints
define('API_ENDPOINTS', [
    'login'          => '/api/auth/login',
    'register'       => '/api/auth/register',
    'projects'       => '/api/projects',
    'project_detail' => '/api/projects/{projectId}',
    'members'        => '/api/projects/{projectId}/members',
    'translations'   => '/api/projects/{projectId}/translations',
    'releases'       => '/api/projects/{projectId}/releases',
]);
