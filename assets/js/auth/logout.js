async function logout() {
    const button = document.getElementById('logout-retry');
    button.disabled = true;
    const endpoint = apiEndpoint('logout');
    if (!endpoint) {
        document.getElementById('logout-status').textContent = 'Chưa cấu hình API đăng xuất của Backend. Phiên Cookie chưa được thu hồi; cần bổ sung endpoint C# trước khi sử dụng chế độ API.';
        return;
    }
    const result = await apiPost(endpoint, {}, { noRedirect: true });
    if (result.success || result.status === 401) {
        clearUserDisplay();
        location.replace(getBaseUrl() + 'login.php?logged_out=1');
    } else {
        document.getElementById('logout-status').textContent = result.message + ' Phiên đăng nhập chưa được kết thúc.';
        button.classList.remove('hidden');
        button.disabled = false;
    }
}
document.getElementById('logout-retry').addEventListener('click', logout);
logout();
