@echo off
chcp 65001 >nul
title Easy-Epidemiology Web v1.2

echo.
echo ========================================
echo   Easy-Epidemiology Web v1.2
echo   오프라인 실행 모드
echo ========================================
echo.

:: 현재 디렉토리로 이동
cd /d "%~dp0"

echo [🔄] Easy-Epidemiology를 시작합니다...
echo [📁] 현재 위치: %CD%
echo.

:: v1.2 폴더의 index.html 파일이 있는지 확인
if not exist "v1.2\index.html" (
    echo [✗] v1.2\index.html 파일을 찾을 수 없습니다.
    echo [💡] v1.2 폴더가 현재 폴더에 있는지 확인해주세요.
    pause
    exit /b 1
)

:: v1.2 폴더의 index.html 파일 열기
echo [✓] 브라우저에서 애플리케이션이 열립니다...
start "" "v1.2\index.html"

echo [✅] Easy-Epidemiology가 성공적으로 시작되었습니다!
echo [💡] 브라우저 창을 확인해주세요.
echo.
echo [👋] 프로그램을 종료하려면 아무 키나 누르세요...
pause >nul 