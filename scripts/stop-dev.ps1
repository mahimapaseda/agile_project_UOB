# Stops any Next.js dev server listening on port 3001.
# Run: powershell -File scripts/stop-dev.ps1

$Port = 3001
$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
    Write-Host "No process listening on port $Port."
    exit 0
}

foreach ($procId in ($connections.OwningProcess | Sort-Object -Unique)) {
    if ($procId -le 0) { continue }
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Stopping $($proc.ProcessName) (PID $procId) on port $Port..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Done."
