# run-system.ps1
# Delta Gemunupura College DBMS Runner Utility
#
# Safe for Cursor / VS Code integrated terminals:
# - No Clear-Host (avoids terminal corruption on Windows)
# - Stops duplicate dev servers before starting
# - Uses webpack dev mode (npm run dev) to reduce RAM + file-watcher load
#
# Usage:
#   .\run-system.ps1        Interactive menu
#   .\run-system.ps1 -Dev   Start dev server directly (recommended in Cursor)

param(
    [switch]$Dev
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
if (-not $PSScriptRoot) { $PSScriptRoot = Get-Location }

$PrimaryColor = "Cyan"
$SecondaryColor = "DarkCyan"
$AccentColor = "Yellow"
$SuccessColor = "Green"
$ErrorColor = "Red"
$DevPort = 3001

function Show-Header {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor $SecondaryColor
    Write-Host "      Delta Gemunupura College - DBMS Runner Utility      " -ForegroundColor $PrimaryColor
    Write-Host "==========================================================" -ForegroundColor $SecondaryColor
    Write-Host ""
}

function Test-Interactive {
    return [Environment]::UserInteractive -and $Host.Name -notmatch 'Server'
}

function Wait-ForKey {
    if (-not (Test-Interactive)) { return }
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor $AccentColor
    try {
        $null = [Console]::ReadKey($true)
    } catch {
        Read-Host | Out-Null
    }
}

function Stop-DevServerOnPort {
    param([int]$Port = $DevPort)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) { return $false }

    $pids = $connections.OwningProcess | Sort-Object -Unique
    foreach ($procId in $pids) {
        if ($procId -le 0) { continue }
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  [i] Stopping existing process on port ${Port}: $($proc.ProcessName) (PID $procId)" -ForegroundColor $AccentColor
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # ignore
        }
    }
    Start-Sleep -Milliseconds 500
    return $true
}

function Start-DevServer {
    Show-Header
    Write-Host "===> Starting development server (webpack, localhost only)..." -ForegroundColor $SuccessColor
    Write-Host "     URL: http://127.0.0.1:${DevPort}" -ForegroundColor $PrimaryColor
    Write-Host "     Tip: Run in an external PowerShell window if Cursor still feels slow." -ForegroundColor $AccentColor
    Write-Host "     Press Ctrl+C to stop." -ForegroundColor $AccentColor
    Write-Host ""

    Stop-DevServerOnPort -Port $DevPort | Out-Null

    # Cap Node memory so Turbopack/webpack cannot exhaust system RAM and crash Cursor/Windows shell.
    $env:NODE_OPTIONS = "--max-old-space-size=2048"

    Set-Location $PSScriptRoot
    npm run dev
}

function Run-Diagnostics {
    Show-Header
    Write-Host "[i] Running environment diagnostics..." -ForegroundColor $AccentColor
    Write-Host ""

    $ready = $true

    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] Node.js ($((node -v).Trim()))" -ForegroundColor $SuccessColor
    } else {
        Write-Host "  [ERROR] Node.js not found (install v18+)." -ForegroundColor $ErrorColor
        $ready = $false
    }

    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] npm ($((npm -v).Trim()))" -ForegroundColor $SuccessColor
    } else {
        Write-Host "  [ERROR] npm not found." -ForegroundColor $ErrorColor
        $ready = $false
    }

    $envFile = Join-Path $PSScriptRoot ".env.local"
    $exampleFile = Join-Path $PSScriptRoot ".env.local.example"

    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "your_api_key_here") {
            Write-Host "  [WARN] .env.local has placeholder values - configure Firebase keys." -ForegroundColor $AccentColor
        } else {
            Write-Host "  [OK] .env.local configured" -ForegroundColor $SuccessColor
        }
    } elseif (Test-Path $exampleFile) {
        Write-Host "  [WARN] .env.local missing - copying from .env.local.example" -ForegroundColor $AccentColor
        Copy-Item $exampleFile $envFile
    } else {
        Write-Host "  [ERROR] .env.local and .env.local.example missing." -ForegroundColor $ErrorColor
        $ready = $false
    }

    if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
        Write-Host "  [WARN] node_modules missing - run: npm install" -ForegroundColor $AccentColor
    } else {
        Write-Host "  [OK] node_modules present" -ForegroundColor $SuccessColor
    }

    Write-Host ""
    if ($ready) {
        Write-Host "[SUCCESS] Ready." -ForegroundColor $SuccessColor
    } else {
        Write-Host "[ERROR] Fix the items above before running." -ForegroundColor $ErrorColor
        exit 1
    }
}

Run-Diagnostics

if ($Dev) {
    Start-DevServer
    exit $LASTEXITCODE
}

while ($true) {
    Show-Header
    Write-Host "Select an action:" -ForegroundColor $PrimaryColor
    Write-Host "  [1] Run Development Server (port $DevPort, webpack - safe mode)" -ForegroundColor $PrimaryColor
    Write-Host "  [2] Create Admin Account (npm run create-admin)" -ForegroundColor $PrimaryColor
    Write-Host "  [3] Migrate Legacy Users (npm run migrate-users)" -ForegroundColor $PrimaryColor
    Write-Host "  [4] Clear All Data (npm run clear-data)" -ForegroundColor $PrimaryColor
    Write-Host "  [5] Build & Start Production Server" -ForegroundColor $PrimaryColor
    Write-Host "  [6] Run Linter (npm run lint)" -ForegroundColor $PrimaryColor
    Write-Host "  [7] Stop dev server on port $DevPort" -ForegroundColor $PrimaryColor
    Write-Host "  [8] Exit" -ForegroundColor $PrimaryColor
    Write-Host ""

    $choice = if (Test-Interactive) { Read-Host "Enter option [1-8]" } else { "8" }

    switch ($choice) {
        "1" {
            Start-DevServer
            Wait-ForKey
        }
        "2" {
            Set-Location $PSScriptRoot; npm run create-admin
            Wait-ForKey
        }
        "3" {
            Set-Location $PSScriptRoot; npm run migrate-users
            Wait-ForKey
        }
        "4" {
            $confirm = if (Test-Interactive) {
                Read-Host "Type YES to delete ALL Firestore + Auth data"
            } else { "" }
            if ($confirm -eq "YES") {
                Set-Location $PSScriptRoot; npm run clear-data
            } else {
                Write-Host "Cancelled." -ForegroundColor $SuccessColor
            }
            Wait-ForKey
        }
        "5" {
            Set-Location $PSScriptRoot
            npm run build
            if ($LASTEXITCODE -eq 0) { npm run start }
            Wait-ForKey
        }
        "6" {
            Set-Location $PSScriptRoot; npm run lint
            Wait-ForKey
        }
        "7" {
            if (Stop-DevServerOnPort -Port $DevPort) {
                Write-Host "Stopped process(es) on port $DevPort." -ForegroundColor $SuccessColor
            } else {
                Write-Host "No listener on port $DevPort." -ForegroundColor $AccentColor
            }
            Wait-ForKey
        }
        "8" { break }
        default {
            Write-Host "Invalid option." -ForegroundColor $ErrorColor
            Wait-ForKey
        }
    }
}

Write-Host "Goodbye." -ForegroundColor $SuccessColor
