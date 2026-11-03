param([ValidateSet('setup','build','up','restart-api','restart-web','down','logs','status','test','test-recovery','tunnel','tunnel-logs','tunnel-down')][string]$Action = 'up')
$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $workspaceRoot
try {
    if (!(Test-Path -LiteralPath '.env.docker')) {
        $randomBytes = New-Object byte[] 24
        $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
        $localPassword = [Convert]::ToBase64String($randomBytes)
        $template = [System.IO.File]::ReadAllText((Join-Path $workspaceRoot '.env.docker.example'))
        [System.IO.File]::WriteAllText((Join-Path $workspaceRoot '.env.docker'), $template.Replace('WSB_TEST_PASSWORD=', "WSB_TEST_PASSWORD=$localPassword"))
        Write-Host 'Created local settings in .env.docker. Test passwords are kept in that ignored file.'
    }
    $settingsPath = Join-Path $workspaceRoot '.env.docker'
    $settings = [System.IO.File]::ReadAllText($settingsPath)
    if ($settings -notmatch '(?m)^WSB_PAYMONGO_LOCAL_SECRET=.+$') {
        $secretBytes = New-Object byte[] 32
        $secretGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $secretGenerator.GetBytes($secretBytes) } finally { $secretGenerator.Dispose() }
        $secretValue = [Convert]::ToBase64String($secretBytes)
        if ($settings -match '(?m)^WSB_PAYMONGO_LOCAL_SECRET=$') { $settings = $settings -replace '(?m)^WSB_PAYMONGO_LOCAL_SECRET=$', "WSB_PAYMONGO_LOCAL_SECRET=$secretValue" }
        else { $settings = $settings.TrimEnd() + "`nWSB_PAYMONGO_LOCAL_SECRET=$secretValue`n" }
        [System.IO.File]::WriteAllText($settingsPath, $settings)
    }
    $hasNgrokToken = ($settings -match '(?m)^NGROK_AUTHTOKEN=[a-zA-Z0-9_\-]{10,}')
    $composeArgs = @('compose','--env-file','.env.docker')
    switch ($Action) {
        'setup' {
            & docker @composeArgs build
            if ($LASTEXITCODE -ne 0) { throw "Docker image build failed ($LASTEXITCODE)." }
            & docker @composeArgs up --no-build -d --wait --wait-timeout 2100
        }
        'build' { & docker @composeArgs build }
        'up' {
            if ($hasNgrokToken) {
                & docker @composeArgs --profile tunnel up --no-build -d --wait --wait-timeout 2100
            } else {
                & docker @composeArgs up --no-build -d --wait --wait-timeout 2100
            }
        }
        'tunnel' {
            & docker @composeArgs --profile tunnel up --no-build -d ngrok
            if ($LASTEXITCODE -ne 0) { throw "Ngrok startup failed ($LASTEXITCODE)." }
            Write-Host 'Ngrok tunnel connected: https://backless-cuddle-endowment.ngrok-free.dev'
            Write-Host 'Ngrok inspector:        http://localhost:4040'
        }
        'tunnel-logs' {
            & docker @composeArgs logs ngrok -f
        }
        'tunnel-down' {
            & docker @composeArgs stop ngrok
            Write-Host 'Ngrok tunnel stopped.'
        }
        'restart-api' {
            & docker @composeArgs restart api
            if ($LASTEXITCODE -ne 0) { throw "API restart failed ($LASTEXITCODE)." }
            & docker @composeArgs up --no-build --detach --wait --wait-timeout 2100 api
        }
        'restart-web' {
            & docker @composeArgs restart web
            if ($LASTEXITCODE -ne 0) { throw "Web restart failed ($LASTEXITCODE)." }
            & docker @composeArgs up --no-build --detach --wait --wait-timeout 2100 web
        }
        'down' { & docker @composeArgs down }
        'logs' { & docker @composeArgs logs --tail 100 -f }
        'status' { & docker @composeArgs ps -a }
        'test' { & docker @composeArgs run --rm --no-deps seed node infra/docker/test-local.cjs }
        'test-recovery' { & docker @composeArgs run --rm --no-deps seed node infra/docker/test-local.cjs --recover }
    }
    if ($LASTEXITCODE -ne 0) { throw "Docker operation failed ($LASTEXITCODE). Check that Docker Desktop is running." }
    if ($Action -eq 'up') {
        Write-Host 'Local stack is ready. See docs/local-docker.md for test accounts, URLs and status checks.'
        if ($hasNgrokToken) {
            Write-Host 'Ngrok tunnel connected: https://backless-cuddle-endowment.ngrok-free.dev'
            Write-Host 'Ngrok inspector:        http://localhost:4040'
        }
    }
} finally { Pop-Location }
