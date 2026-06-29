# Push Rozana Ops (web app only) to a new GitHub repo for Netlify.
# Usage: .\push-ops-to-netlify-repo.ps1 -RepoUrl "https://github.com/ORG/rozana-ops.git"
param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

$ErrorActionPreference = 'Stop'
$root = git -C $PSScriptRoot rev-parse --show-toplevel
Set-Location $root

$branch = 'netlify-ops-export'
Write-Host "Building app-only history from Rozanaretreats/app ..."
git subtree split --prefix=Rozanaretreats/app -b $branch

Write-Host "Pushing to $RepoUrl (branch: main) ..."
git push $RepoUrl "${branch}:main" --force

Write-Host ""
Write-Host "Done. In Netlify:"
Write-Host "  - Connect this new repo"
Write-Host "  - Build command: npm run build"
Write-Host "  - Publish directory: dist"
Write-Host "  - Environment variables:"
Write-Host "      VITE_SUPABASE_URL=https://oqksrcruypdmsggorrge.supabase.co"
Write-Host "      VITE_SUPABASE_ANON_KEY=<anon key from Supabase>"
Write-Host "      VITE_ALLOW_MANUAL_PUNCHES=false"
