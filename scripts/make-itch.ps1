# Builds the itch.io upload: a production build in "itch" mode (no debug menu) zipped to release/neon-ledger-itch.zip.
# A real zip with forward-slash paths (Compress-Archive on PowerShell 5.1 and tar both break itch.io).
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
npx vite build --mode itch
if ($LASTEXITCODE -ne 0) { throw 'build failed' }
Add-Type -AssemblyName System.IO.Compression.FileSystem, System.IO.Compression
$dist = (Resolve-Path 'dist').Path; $out = Join-Path (Get-Location) 'release\neon-ledger-itch.zip'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
if (Test-Path $out) { Remove-Item $out -Force }
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
  Get-ChildItem $dist -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($dist.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal')
  }
} finally { $zip.Dispose() }
"wrote $out ($((Get-Item $out).Length) bytes)"
