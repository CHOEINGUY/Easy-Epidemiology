# Easy-Epidemiology Web v1.2 PowerShell Launcher
# Windows Defender SmartScreen 경고 해결을 위한 PowerShell 버전

param(
    [switch]$NoLogo
)

if (-not $NoLogo) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Easy-Epidemiology Web v1.2" -ForegroundColor White
    Write-Host "  오프라인 실행 모드 (PowerShell)" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# 현재 스크립트 위치로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "[🔄] Easy-Epidemiology를 시작합니다..." -ForegroundColor Yellow
Write-Host "[📁] 현재 위치: $scriptPath" -ForegroundColor Gray
Write-Host ""

# v1.2 폴더의 index.html 파일이 있는지 확인
$indexPath = Join-Path $scriptPath "v1.2\index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "[✗] v1.2\index.html 파일을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "[💡] v1.2 폴더가 현재 폴더에 있는지 확인해주세요." -ForegroundColor Yellow
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}

# v1.2 폴더의 index.html 파일 열기
Write-Host "[✓] 브라우저에서 애플리케이션이 열립니다..." -ForegroundColor Green
try {
    Start-Process $indexPath
    Write-Host "[✅] Easy-Epidemiology가 성공적으로 시작되었습니다!" -ForegroundColor Green
    Write-Host "[💡] 브라우저 창을 확인해주세요." -ForegroundColor Cyan
} catch {
    Write-Host "[✗] 브라우저 실행 중 오류가 발생했습니다: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "[👋] 프로그램을 종료하려면 Enter를 누르세요..." -ForegroundColor Gray
Read-Host 