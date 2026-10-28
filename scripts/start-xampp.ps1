$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
# Tương thích Windows PowerShell 5.1 (.NET Framework không có RandomNumberGenerator.GetBytes(int)).
function New-RandomBase64([int]$Count) {
    $bytes = New-Object byte[] $Count
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
Set-Location -LiteralPath $projectRoot
$localRoot = Join-Path $projectRoot '.local'
$backendDirectory = Join-Path $projectRoot 'backend\TranslationManager.Backend'
$mysql = 'C:\xampp\mysql\bin\mysql.exe'
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null

# The normal website uses the same XAMPP database as the Backend F5 profile.
$settings = Get-Content -Raw -LiteralPath (Join-Path $backendDirectory 'appsettings.json') | ConvertFrom-Json
$connection = [System.Data.Common.DbConnectionStringBuilder]::new()
$connection.set_ConnectionString([string]$settings.ConnectionStrings.Default)
if ([string]$connection['Server'] -notin @('127.0.0.1', 'localhost') -or [string]$connection['Port'] -ne '3306' -or [string]$connection['Database'] -ne 'translation_manager') {
    throw 'start-xampp.ps1 yêu cầu cấu hình Backend trỏ tới 127.0.0.1:3306 / translation_manager.'
}
$savedMysqlPassword = [Environment]::GetEnvironmentVariable('MYSQL_PWD', 'Process')
try {
    $env:MYSQL_PWD = [string]$connection['Password']
    $databaseCheck = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'; SELECT system_role,is_active,security_version FROM users LIMIT 0; SELECT id FROM system_admin_guard WHERE id=1;" |
        & $mysql --host=127.0.0.1 --port=3306 "--user=$($connection['User ID'])" --database=translation_manager --connect-timeout=5 --batch --skip-column-names
    if ($LASTEXITCODE -ne 0 -or [int]$databaseCheck[0] -lt 17 -or $databaseCheck[-1] -ne '1') {
        throw 'CSDL XAMPP chưa sẵn sàng. Bật MySQL trong XAMPP và kiểm tra schema/migration của translation_manager.'
    }
} finally { [Environment]::SetEnvironmentVariable('MYSQL_PWD', $savedMysqlPassword, 'Process') }

function Get-XamppListener([int]$Port) {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
}
function Assert-XamppOwnedPort([int]$Port, [string]$Expected) {
    $listener = Get-XamppListener $Port
    if ($listener) {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (!$processInfo.CommandLine -or !$processInfo.CommandLine.Contains($Expected)) {
            throw "Cổng $Port đang do tiến trình khác sử dụng. Dừng Backend F5 trước khi dùng bộ chạy này."
        }
    }
    return $listener
}
$backendListener = Assert-XamppOwnedPort 5088 $backendDirectory
$frontendListener = Assert-XamppOwnedPort 8095 'router.php'

$projectFile = Join-Path $backendDirectory 'TranslationManager.Api.csproj'
if (!(Test-Path -LiteralPath (Join-Path $backendDirectory 'obj\project.assets.json'))) {
    dotnet restore $projectFile --packages (Join-Path $localRoot 'nuget')
    if ($LASTEXITCODE -ne 0) { throw 'NuGet restore thất bại.' }
}
# Always restart our Backend so an old demo process cannot keep port 3307.
if ($backendListener) {
    Stop-Process -Id $backendListener.OwningProcess
    for ($attempt = 0; $attempt -lt 40 -and (Get-XamppListener 5088); $attempt++) { Start-Sleep -Milliseconds 100 }
    if (Get-XamppListener 5088) { throw 'Backend cũ chưa dừng tại cổng 5088.' }
}
# Windows locks the running DLL: stop the verified local API before rebuilding it.
dotnet build $projectFile --no-restore
if ($LASTEXITCODE -ne 0) { throw 'Backend build thất bại.' }

$databaseKey = Join-Path $localRoot 'backend-jwt.3306.translation_manager.key'
if (!(Test-Path -LiteralPath $databaseKey)) {
    [IO.File]::WriteAllText($databaseKey, (New-RandomBase64 64))
}
Copy-Item -LiteralPath $databaseKey -Destination (Join-Path $localRoot 'backend-jwt.key') -Force
$savedEnvironment = @{}
foreach ($key in @('ConnectionStrings__Default', 'Jwt__Key', 'FrontendOrigins')) {
    $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
    $env:ConnectionStrings__Default = $connection.get_ConnectionString()
    $env:Jwt__Key = [IO.File]::ReadAllText($databaseKey).Trim()
    $env:FrontendOrigins = 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8095,http://127.0.0.1:8095'
    $backendDll = Join-Path $backendDirectory 'bin\Debug\net10.0\TranslationManager.Api.dll'
    Start-Process -FilePath (Get-Command dotnet).Source -WindowStyle Hidden -WorkingDirectory $backendDirectory `
        -ArgumentList @("`"$backendDll`"", '--urls', 'http://127.0.0.1:5088') `
        -RedirectStandardOutput (Join-Path $localRoot 'backend.stdout.log') -RedirectStandardError (Join-Path $localRoot 'backend.stderr.log') | Out-Null
} finally {
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
}
for ($attempt = 0; $attempt -lt 40 -and !(Get-XamppListener 5088); $attempt++) { Start-Sleep -Milliseconds 250 }
if (!(Get-XamppListener 5088)) { throw 'Backend không khởi động; xem .local/backend.stderr.log.' }
$health = Invoke-RestMethod -Uri 'http://127.0.0.1:5088/health' -TimeoutSec 10
if ($health.database -ne 'CONNECTED') { throw 'Backend chưa kết nối được CSDL XAMPP.' }

$environmentPath = Join-Path $projectRoot '.env.local'
$environmentText = if (Test-Path -LiteralPath $environmentPath) { [IO.File]::ReadAllText($environmentPath) } else { '' }
foreach ($setting in @{ API_BASE_URL = 'http://127.0.0.1:5088' }.GetEnumerator()) {
    $pattern = '(?m)^' + $setting.Key + '=.*$'
    if ($environmentText -match $pattern) { $environmentText = [regex]::Replace($environmentText, $pattern, ($setting.Key + '=' + $setting.Value)) }
    else { $environmentText += "`n$($setting.Key)=$($setting.Value)`n" }
}
[IO.File]::WriteAllText($environmentPath, $environmentText)
[IO.File]::WriteAllText((Join-Path $localRoot 'integrated-runtime.json'), (@{ profile = 'xampp'; database = 'translation_manager'; port = 3306 } | ConvertTo-Json -Compress))
if (!$frontendListener) {
    Start-Process -FilePath 'C:\xampp\php\php.exe' -WindowStyle Hidden -WorkingDirectory $projectRoot `
        -ArgumentList @('-S', '127.0.0.1:8095', 'router.php') `
        -RedirectStandardOutput (Join-Path $localRoot 'frontend.stdout.log') -RedirectStandardError (Join-Path $localRoot 'frontend.stderr.log') | Out-Null
}
Write-Output 'Website chính: http://localhost:8081/TranslationManager.Frontend/'
Write-Output 'URL tương đương: http://127.0.0.1:8095/'
Write-Output 'Backend 5088 -> MySQL XAMPP 3306 -> translation_manager; /health: CONNECTED'
Write-Output 'Khi chuyển từ demo sang XAMPP, đăng nhập lại bằng tài khoản trong CSDL chính.'
