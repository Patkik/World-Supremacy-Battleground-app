$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $workspaceRoot
try {
    Write-Host 'Running synthetic local role workflow checks...'
    & ./tools/local.ps1 test
    if ($LASTEXITCODE -ne 0) { throw 'Local role workflow checks failed.' }

    Write-Host 'Checking persisted role workflow recovery...'
    & ./tools/local.ps1 test-recovery
    if ($LASTEXITCODE -ne 0) { throw 'Role workflow recovery checks failed.' }

    Write-Host 'Running synthetic music workflow checks...'
    & node tests/music-workflow-integration.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Music workflow checks failed.' }

    Write-Host 'Running synthetic draft policy checks...'
    & node tests/music-policy-integration.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Music policy checks failed.' }

    Write-Host 'Checking public and participant page content...'
    & node tests/content-integrity.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Content integrity checks failed.' }

    Write-Host 'Running judging outbox checks...'
    & node --test tests/judging-outbox.test.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Judging outbox checks failed.' }

    Write-Host 'Checking accessibility and public projection boundaries...'
    & node tests/audit-browser.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Accessibility and projection browser checks failed.' }

    Write-Host 'Synthetic rehearsal checks passed. Browser interaction, actual music compliance, guardian authority and a complete all-role event remain outside this suite.'
} finally {
    Pop-Location
}
