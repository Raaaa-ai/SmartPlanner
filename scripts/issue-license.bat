@echo off
setlocal
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js not found. Please install Node.js before running this tool.
  echo.
  pause
  exit /b 1
)

echo ==========================================
echo   SmartPlanner License Generator
echo ==========================================
echo.

set "MACHINE="
set /p MACHINE=Enter machine code (SP-XXXX-...): 
if "%MACHINE%"=="" (
  echo Machine code is required.
  pause
  exit /b 1
)

set "LABEL="
set /p LABEL=Enter label (optional): 
if "%LABEL%"=="" set "LABEL=Authorized User"

echo.
set "LICENSE="
for /f "usebackq delims=" %%i in (`node "%~dp0issue-license.mjs" "%MACHINE%" "%LABEL%"`) do set "LICENSE=%%i"

if "%LICENSE%"=="" (
  echo Failed to generate the activation code. See the error above.
  pause
  exit /b 1
)

echo Activation code:
echo.
echo %LICENSE%
echo.
echo %LICENSE% | clip >nul 2>nul
if errorlevel 1 (
  echo Copied failed. Please copy the code above manually.
) else (
  echo Copied to clipboard.
)

echo.
pause
endlocal
