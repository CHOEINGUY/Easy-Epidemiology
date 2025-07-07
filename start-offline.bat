@echo off
echo ========================================
echo Easy-Epidemiology Web - 오프라인 실행
echo ========================================
echo.

REM 현재 디렉토리 확인
if not exist "dist\index.html" (
    echo [오류] dist 폴더를 찾을 수 없습니다.
    echo 먼저 'npm run build'를 실행하여 빌드를 생성하세요.
    pause
    exit /b 1
)

echo [정보] dist 폴더를 찾았습니다.
echo.

REM 실행 방법 선택
echo 실행 방법을 선택하세요:
echo 1. 파일 직접 열기 (file:/// 프로토콜)
echo 2. 로컬 서버 실행 (HTTP 프로토콜)
echo 3. 테스트 페이지 열기
echo.
set /p choice="선택 (1-3): "

if "%choice%"=="1" goto file_protocol
if "%choice%"=="2" goto local_server
if "%choice%"=="3" goto test_page

echo 잘못된 선택입니다.
pause
exit /b 1

:file_protocol
echo.
echo [정보] 파일 직접 열기 모드로 실행합니다...
echo 브라우저에서 dist\index.html 파일을 열어주세요.
echo.
echo 주의: file:/// 환경에서는 일부 기능이 제한될 수 있습니다.
echo.
start "" "dist\index.html"
goto end

:local_server
echo.
echo [정보] 로컬 서버를 시작합니다...
echo.

REM Python 확인
python --version >nul 2>&1
if %errorlevel%==0 (
    echo Python을 사용하여 서버를 시작합니다...
    echo 서버 주소: http://localhost:8080
    echo.
    echo 브라우저에서 위 주소로 접속하세요.
    echo 서버를 중지하려면 Ctrl+C를 누르세요.
    echo.
    cd dist
    python -m http.server 8080
    goto end
)

REM Node.js 확인
node --version >nul 2>&1
if %errorlevel%==0 (
    echo Node.js를 사용하여 서버를 시작합니다...
    echo 서버 주소: http://localhost:8080
    echo.
    echo 브라우저에서 위 주소로 접속하세요.
    echo 서버를 중지하려면 Ctrl+C를 누르세요.
    echo.
    cd dist
    npx http-server -p 8080
    goto end
)

echo [오류] Python 또는 Node.js가 설치되어 있지 않습니다.
echo 다음 중 하나를 설치하세요:
echo - Python: https://www.python.org/downloads/
echo - Node.js: https://nodejs.org/
echo.
echo 또는 dist\index.html 파일을 브라우저에서 직접 열어주세요.
pause
goto end

:test_page
echo.
echo [정보] 테스트 페이지를 엽니다...
start "" "test-offline.html"
goto end

:end
echo.
echo [완료] Easy-Epidemiology Web이 실행되었습니다.
echo.
pause 