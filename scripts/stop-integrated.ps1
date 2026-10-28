$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
$expectedCommands = @{
    8095 = 'router.php'
    5088 = (Join-Path $projectRoot 'backend\TranslationManager.Backend')
    3307 = (Join-Path $projectRoot '.local\mysql-api\my.ini')
}
foreach ($port in @(8095, 5088, 3307)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$listener) { continue }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if (!$processInfo.CommandLine -or !$processInfo.CommandLine.Contains($expectedCommands[$port])) { throw "Tiến trình tại cổng $port không thuộc bộ chạy này." }
    if ($port -eq 3307) {
        & C:\xampp\mysql\bin\mysqladmin.exe --host=127.0.0.1 --port=3307 --user=root shutdown
        if ($LASTEXITCODE -ne 0) { throw 'Không dừng được MariaDB kiểm thử.' }
    } else { Stop-Process -Id $listener.OwningProcess }
}
Write-Output 'Đã dừng các dịch vụ tích hợp local. Dữ liệu .local/mysql-api được giữ lại.'
