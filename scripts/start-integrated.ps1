param([ValidateSet('translation_manager', 'translation_manager_demo')][string]$DatabaseName = 'translation_manager')
$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $projectRoot
$localRoot = Join-Path $projectRoot '.local'
$dbDirectory = Join-Path $localRoot 'mysql-api'
$backendDirectory = Join-Path $projectRoot 'backend\TranslationManager.Backend'
$mysqlBin = 'C:\xampp\mysql\bin'
$phpPath = 'C:\xampp\php\php.exe'
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $dbDirectory 'my.ini'))) {
    & (Join-Path $mysqlBin 'mysql_install_db.exe') "--datadir=$dbDirectory" --port=3307 --silent
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được database kiểm thử riêng.' }
}
function Get-Listener([int]$Port) {
    Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
}
function Assert-OwnedPort([int]$Port, [string]$Expected) {
    $listener = Get-Listener $Port
    if ($listener) {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
        if (!$processInfo.CommandLine -or !$processInfo.CommandLine.Contains($Expected)) {
            throw "Cổng $Port đang do tiến trình khác sử dụng. Không thay đổi tiến trình hoặc dữ liệu đó."
        }
    }
    return $listener
}
if (!(Assert-OwnedPort 3307 (Join-Path $dbDirectory 'my.ini'))) {
    Start-Process -FilePath (Join-Path $mysqlBin 'mysqld.exe') -WindowStyle Hidden -WorkingDirectory $projectRoot `
        -ArgumentList @("--defaults-file=`"$(Join-Path $dbDirectory 'my.ini')`"", '--bind-address=127.0.0.1', '--console') `
        -RedirectStandardOutput (Join-Path $localRoot 'mysql.stdout.log') -RedirectStandardError (Join-Path $localRoot 'mysql.stderr.log') | Out-Null
    for ($attempt = 0; $attempt -lt 40 -and !(Get-Listener 3307); $attempt++) { Start-Sleep -Milliseconds 250 }
    if (!(Get-Listener 3307)) { throw 'MariaDB không khởi động; xem .local/mysql.stderr.log.' }
}
# Chỉ nạp schema vào MariaDB riêng tại cổng 3307 đã xác minh ở trên.
function Read-DatabaseSql([string]$Path) { return ([IO.File]::ReadAllText($Path) -replace '\btranslation_manager\b', $DatabaseName) }
Read-DatabaseSql (Join-Path $backendDirectory 'database\schema.sql') | & (Join-Path $mysqlBin 'mysql.exe') --host=127.0.0.1 --port=3307 --user=root --default-character-set=utf8mb4
if ($LASTEXITCODE -ne 0) { throw 'Không nạp được schema.' }
Read-DatabaseSql (Join-Path $backendDirectory 'database\seed.sql') | & (Join-Path $mysqlBin 'mysql.exe') --host=127.0.0.1 --port=3307 --user=root --default-character-set=utf8mb4
if ($LASTEXITCODE -ne 0) { throw 'Không nạp được locale seed.' }
# Upgrade only this isolated database; CREATE TABLE IF NOT EXISTS cannot upgrade existing tables.
foreach ($migration in @('002_duc_translation_release.sql', '003_manh_source_management.sql', '004_system_admin.sql')) {
    Read-DatabaseSql (Join-Path $backendDirectory ('database\migrations\' + $migration)) | & (Join-Path $mysqlBin 'mysql.exe') --host=127.0.0.1 --port=3307 --user=root --default-character-set=utf8mb4
    if ($LASTEXITCODE -ne 0) { throw "Không nâng cấp được database kiểm thử: $migration" }
}
$jwtFile = Join-Path $localRoot 'backend-jwt.key'
$runtimeFile = Join-Path $localRoot 'integrated-runtime.json'
$previousDatabase = 'translation_manager'
$previousPort = 3307
if (Test-Path -LiteralPath $runtimeFile) {
    $previousRuntime = Get-Content -Raw -LiteralPath $runtimeFile | ConvertFrom-Json
    $previousDatabase = $previousRuntime.database
    $previousPort = $previousRuntime.port
}
$backendListener = Assert-OwnedPort 5088 $backendDirectory
if ($backendListener -and ($previousDatabase -ne $DatabaseName -or $previousPort -ne 3307)) { Stop-Process -Id $backendListener.OwningProcess; $backendListener = $null }
$previousKey = Join-Path $localRoot ('backend-jwt.' + $previousDatabase + '.key')
if ($previousPort -eq 3307 -and (Test-Path -LiteralPath $jwtFile) -and !(Test-Path -LiteralPath $previousKey)) { Copy-Item -LiteralPath $jwtFile -Destination $previousKey }
$databaseKey = Join-Path $localRoot ('backend-jwt.' + $DatabaseName + '.key')
if (!(Test-Path -LiteralPath $databaseKey)) { [IO.File]::WriteAllText($databaseKey, [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(64))) }
Copy-Item -LiteralPath $databaseKey -Destination $jwtFile -Force
if (!(Test-Path -LiteralPath $jwtFile)) {
    [IO.File]::WriteAllText($jwtFile, [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(64)))
}
if (!$backendListener) {
    dotnet restore (Join-Path $backendDirectory 'TranslationManager.Api.csproj') --packages (Join-Path $localRoot 'nuget')
    if ($LASTEXITCODE -ne 0) { throw 'NuGet restore thất bại.' }
    dotnet build (Join-Path $backendDirectory 'TranslationManager.Api.csproj') --no-restore
    if ($LASTEXITCODE -ne 0) { throw 'Backend build thất bại.' }
    $savedBackendEnvironment = @{}
    foreach ($key in @('ConnectionStrings__Default', 'Jwt__Key', 'FrontendOrigins')) { $savedBackendEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
    $env:ConnectionStrings__Default = "Server=127.0.0.1;Port=3307;Database=$DatabaseName;User ID=root;Password=;"
    $env:Jwt__Key = [IO.File]::ReadAllText($jwtFile).Trim()
    $env:FrontendOrigins = 'http://127.0.0.1:8095,http://localhost:8095'
    try {
        $backendDll = Join-Path $backendDirectory 'bin\Debug\net10.0\TranslationManager.Api.dll'
        Start-Process -FilePath (Get-Command dotnet).Source -WindowStyle Hidden -WorkingDirectory $backendDirectory `
            -ArgumentList @("`"$backendDll`"", '--urls', 'http://127.0.0.1:5088') `
            -RedirectStandardOutput (Join-Path $localRoot 'backend.stdout.log') -RedirectStandardError (Join-Path $localRoot 'backend.stderr.log') | Out-Null
    } finally {
        foreach ($key in $savedBackendEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedBackendEnvironment[$key], 'Process') }
    }
    for ($attempt = 0; $attempt -lt 40 -and !(Get-Listener 5088); $attempt++) { Start-Sleep -Milliseconds 250 }
    if (!(Get-Listener 5088)) { throw 'Backend không khởi động; xem .local/backend.stderr.log.' }
}
[IO.File]::WriteAllText($runtimeFile, (@{ database = $DatabaseName; port = 3307 } | ConvertTo-Json -Compress))
$environmentPath = Join-Path $projectRoot '.env.local'
$environmentText = if (Test-Path -LiteralPath $environmentPath) { [IO.File]::ReadAllText($environmentPath) } else { '' }
foreach ($setting in @{ API_BASE_URL = 'http://127.0.0.1:5088' }.GetEnumerator()) {
    $pattern = '(?m)^' + $setting.Key + '=.*$'
    if ($environmentText -match $pattern) { $environmentText = [regex]::Replace($environmentText, $pattern, ($setting.Key + '=' + $setting.Value)) }
    else { $environmentText += "`n$($setting.Key)=$($setting.Value)`n" }
}
[IO.File]::WriteAllText($environmentPath, $environmentText)
if (!(Assert-OwnedPort 8095 'router.php')) {
    Start-Process -FilePath $phpPath -WindowStyle Hidden -WorkingDirectory $projectRoot `
        -ArgumentList @('-S', '127.0.0.1:8095', 'router.php') `
        -RedirectStandardOutput (Join-Path $localRoot 'frontend.stdout.log') -RedirectStandardError (Join-Path $localRoot 'frontend.stderr.log') | Out-Null
}
Write-Output 'Frontend: http://127.0.0.1:8095 | Backend: http://127.0.0.1:5088 | MariaDB riêng: 127.0.0.1:3307'
Write-Output "Database: $DatabaseName"
Write-Output 'Đăng ký tài khoản qua giao diện. Tài khoản mô phỏng local không tự chuyển vào database.'
