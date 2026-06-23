# Push Firebase Admin credentials to Vercel (requires: npx vercel login + vercel link)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$prep = Join-Path $root "scripts\prepare-vercel-admin-env.mjs"
node $prep
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$b64File = Join-Path $root ".vercel-FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.txt"
if (-not (Test-Path $b64File)) {
  Write-Error "Missing $b64File — run npm run prepare-vercel-env first."
}

Write-Host ""
Write-Host "Pushing FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 to Vercel (Production + Preview)..."
Write-Host "You must be logged in: npx vercel login"
Write-Host "Project linked: npx vercel link"
Write-Host ""

$value = Get-Content $b64File -Raw
foreach ($target in @("production", "preview")) {
  Write-Host "Adding for $target ..."
  $value | npx --yes vercel@latest env add FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 $target --force
  if ($LASTEXITCODE -ne 0) {
    Write-Host "If env add failed, paste manually from: $b64File"
    exit 1
  }
}

$pepperFile = Join-Path $root ".vercel-QUICK_PIN_PEPPER.txt"
if (Test-Path $pepperFile) {
  Write-Host ""
  Write-Host "Pushing QUICK_PIN_PEPPER to Vercel (Production + Preview)..."
  $pepper = Get-Content $pepperFile -Raw
  foreach ($target in @("production", "preview")) {
    Write-Host "Adding QUICK_PIN_PEPPER for $target ..."
    $pepper | npx --yes vercel@latest env add QUICK_PIN_PEPPER $target --force
    if ($LASTEXITCODE -ne 0) {
      Write-Host "If env add failed, paste manually from: $pepperFile"
      exit 1
    }
  }
}

Write-Host ""
Write-Host "Done. Redeploy in Vercel dashboard, then open:"
Write-Host "  https://YOUR-APP.vercel.app/api/health/firebase-admin"
Write-Host '  Expect: {"ok":true,...}'
