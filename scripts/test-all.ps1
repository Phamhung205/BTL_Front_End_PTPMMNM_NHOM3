$projectRoot = Split-Path -Parent $PSScriptRoot
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $projectRoot
& (Join-Path $PSScriptRoot 'stop-integrated.ps1')
& (Join-Path $PSScriptRoot 'prepare-demo.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Chuẩn bị demo thất bại.' }
$env:TM_DEMO_ISOLATED = '1'
try { node (Join-Path $projectRoot 'tests\all.mjs') }
finally { Remove-Item Env:\TM_DEMO_ISOLATED -ErrorAction SilentlyContinue }
if ($LASTEXITCODE -ne 0) { throw 'Có bài kiểm thử chưa đạt; xem artifacts/test-report.md và artifacts/test-all.log.' }
