@echo off
chcp 65001 >nul
title Easy-Epidemiology Web v1.2 (Safe Mode)

echo.
echo ========================================
echo   Easy-Epidemiology Web v1.2
echo   안전 실행 모드
echo ========================================
echo.

:: 현재 디렉토리로 이동
cd /d "%~dp0"

echo [🔄] Easy-Epidemiology를 시작합니다...
echo [📁] 현재 위치: %CD%
echo.

:: PowerShell 실행 정책 확인 및 설정
echo [🔧] PowerShell 실행 정책을 확인합니다...
powershell -Command "Get-ExecutionPolicy" > temp_policy.txt
set /p CURRENT_POLICY=<temp_policy.txt
del temp_policy.txt

if "%CURRENT_POLICY%"=="Restricted" (
    echo [⚠️] PowerShell 실행 정책이 제한되어 있습니다.
    echo [🔧] 현재 사용자에 대해 실행 정책을 변경합니다...
    powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
    echo [✅] 실행 정책이 변경되었습니다.
)

:: v1.2 폴더의 index.html 파일이 있는지 확인
if not exist "v1.2\index.html" (
    echo [✗] v1.2\index.html 파일을 찾을 수 없습니다.
    echo [💡] v1.2 폴더가 현재 폴더에 있는지 확인해주세요.
    pause
    exit /b 1
)

:: PowerShell 스크립트가 있으면 PowerShell로 실행, 없으면 직접 브라우저 실행
if exist "Easy-Epidemiology.ps1" (
    echo [✓] PowerShell 스크립트를 사용하여 실행합니다...
    powershell -ExecutionPolicy Bypass -File "Easy-Epidemiology.ps1"
) else (
    echo [✓] 브라우저에서 애플리케이션이 열립니다...
    start "" "v1.2\index.html"
    echo [✅] Easy-Epidemiology가 성공적으로 시작되었습니다!
    echo [💡] 브라우저 창을 확인해주세요.
)

echo.
echo [👋] 프로그램을 종료하려면 아무 키나 누르세요...
pause >nul 