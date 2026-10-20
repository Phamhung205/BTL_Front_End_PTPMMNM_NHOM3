<?php
/**
 * Navbar Component - Translation Manager
 * Thanh điều hướng phía trên
 */
?>
<nav class="fixed top-0 left-0 lg:left-64 right-0 z-10 bg-white border-b border-gray-200">
    <div class="flex items-center justify-between px-4 sm:px-6 py-3">
        <!-- Left: Hamburger + Page Title -->
        <div class="flex items-center gap-3">
            <!-- Hamburger Menu (Mobile) -->
            <button onclick="toggleSidebar()" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <h1 class="text-lg font-semibold text-gray-900">
                <?php echo htmlspecialchars($pageTitle ?? 'Dashboard', ENT_QUOTES, 'UTF-8'); ?>
            </h1>
        </div>

        <!-- Right: User Menu -->
        <div class="flex items-center gap-3">
            <div class="hidden sm:block text-right">
                <p id="navbar-user-name" class="text-sm font-medium text-gray-900">Người dùng</p>
                <p id="navbar-user-email" class="text-xs text-gray-500">user@example.com</p>
            </div>
            <div class="relative">
                <button onclick="toggleUserMenu()" id="user-menu-btn" class="flex items-center justify-center w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold hover:bg-indigo-200 transition-colors">
                    <span id="navbar-user-avatar">U</span>
                </button>
                <!-- User Dropdown -->
                <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div class="px-4 py-2 border-b border-gray-100 sm:hidden">
                        <p id="dropdown-user-name" class="text-sm font-medium text-gray-900">Người dùng</p>
                        <p id="dropdown-user-email" class="text-xs text-gray-500">user@example.com</p>
                    </div>
                    <a href="<?php echo $baseUrl; ?>logout.php" onclick="try { sessionStorage.clear(); } catch (e) {}" class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        Đăng xuất
                    </a>
                </div>
            </div>
        </div>
    </div>
</nav>
