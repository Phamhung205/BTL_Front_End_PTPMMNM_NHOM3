param([string]$Email = 'admin@translationmanager.local')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectRoot 'backend\TranslationManager.Backend'
$privateDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $privateDirectory -Force | Out-Null
$accountPath = Join-Path $privateDirectory 'admin-account.json'
if (Test-Path -LiteralPath $accountPath) {
    $account = Get-Content -LiteralPath $accountPath -Raw | ConvertFrom-Json
    if ($account.email -ne $Email) { throw 'File Admin riêng đã thuộc email khác. Không ghi đè thông tin đang có.' }
} else {
    $account = @{ email = $Email; password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)); displayName = 'Quản trị hệ thống'; database = 'translation_manager'; port = 3306 }
    $account | ConvertTo-Json | Set-Content -LiteralPath $accountPath -Encoding utf8
}
$settings = Get-Content -LiteralPath (Join-Path $backendDirectory 'appsettings.json') -Raw | ConvertFrom-Json
$connection = [System.Data.Common.DbConnectionStringBuilder]::new()
$connection.set_ConnectionString([string]$settings.ConnectionStrings.Default)
if ([string]$connection['Server'] -notin @('127.0.0.1','localhost') -or [string]$connection['Port'] -ne '3306' -or [string]$connection['Database'] -ne 'translation_manager') { throw 'Chỉ tạo Admin riêng trong translation_manager trên localhost:3306.' }
dotnet build (Join-Path $backendDirectory 'TranslationManager.Api.csproj') --no-restore
if ($LASTEXITCODE -ne 0) { throw 'Backend build thất bại.' }
$savedEnvironment = @{}
foreach ($key in @('ConnectionStrings__Default','Jwt__Key','BootstrapAdmin__Email','BootstrapAdmin__DisplayName','BootstrapAdmin__Password')) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key,'Process') }
try {
    $env:ConnectionStrings__Default = $connection.get_ConnectionString()
    $env:Jwt__Key = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
    $env:BootstrapAdmin__Email = $account.email; $env:BootstrapAdmin__DisplayName = $account.displayName; $env:BootstrapAdmin__Password = $account.password
    Push-Location -LiteralPath $backendDirectory
    try { dotnet (Join-Path $backendDirectory 'bin\Debug\net10.0\TranslationManager.Api.dll') --create-local-admin }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được Admin. File thông tin riêng được giữ để thử lại; chưa coi tài khoản là đã tạo.' }
} finally { foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key,$savedEnvironment[$key],'Process') } }
Write-Output "Admin riêng: $Email / translation_manager:3306. Mật khẩu nằm trong $accountPath (không đưa lên Git)."
