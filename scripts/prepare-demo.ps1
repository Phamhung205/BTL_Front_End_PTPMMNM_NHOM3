$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $projectRoot
& (Join-Path $PSScriptRoot 'start-integrated.ps1') -DatabaseName 'translation_manager_demo'
if ($LASTEXITCODE -ne 0) { throw 'Không khởi động được bộ demo riêng.' }
$savedEnvironment = @{}
foreach ($key in @('ConnectionStrings__Default', 'Jwt__Key', 'BootstrapAdmin__Email', 'BootstrapAdmin__DisplayName', 'BootstrapAdmin__Password')) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
    $env:ConnectionStrings__Default = 'Server=127.0.0.1;Port=3307;Database=translation_manager_demo;User ID=root;Password=;'
    $env:Jwt__Key = [IO.File]::ReadAllText((Join-Path $projectRoot '.local\backend-jwt.key')).Trim()
    $env:BootstrapAdmin__Email = 'admin.demo@tm.local'
    $env:BootstrapAdmin__DisplayName = 'Admin Demo'
    # Disposable, loopback-only demo accounts, never production credentials.
    $env:BootstrapAdmin__Password = 'Demo@2026Admin!'
    $backendDirectory = Join-Path $projectRoot 'backend\TranslationManager.Backend'
    Push-Location -LiteralPath $backendDirectory
    try { dotnet (Join-Path $backendDirectory 'bin\Debug\net10.0\TranslationManager.Api.dll') --bootstrap-admin }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'Không khởi tạo được Admin demo.' }
} finally {
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
}
$env:TM_DEMO_ISOLATED = '1'
try { node (Join-Path $PSScriptRoot 'demo\prepare-demo.mjs') }
finally { Remove-Item Env:\TM_DEMO_ISOLATED -ErrorAction SilentlyContinue }
if ($LASTEXITCODE -ne 0) { throw 'Không chuẩn bị được dữ liệu demo.' }
$savedCatalogEnvironment = @{}
foreach ($key in @('API_BASE_URL','TM_CATALOG_CREDENTIALS','TM_CATALOG_RESULT')) { $savedCatalogEnvironment[$key] = [Environment]::GetEnvironmentVariable($key,'Process') }
try {
    $env:API_BASE_URL = 'http://127.0.0.1:5088'
    $env:TM_CATALOG_CREDENTIALS = Join-Path $projectRoot '.local\catalog-accounts.demo.json'
    $env:TM_CATALOG_RESULT = Join-Path $projectRoot '.local\catalog-import-result.demo.json'
    node (Join-Path $PSScriptRoot 'demo\import-website-catalog.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Không import được hai bộ bản dịch và tình huống 2.' }
} finally { foreach ($key in $savedCatalogEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key,$savedCatalogEnvironment[$key],'Process') } }
