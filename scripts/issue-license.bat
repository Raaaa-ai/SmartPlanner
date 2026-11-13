@echo off
setlocal
chcp 65001 >nul

echo ==========================================
echo   SmartPlanner License Generator
echo ==========================================
echo.

where wsl.exe >nul 2>nul
if errorlevel 1 (
  echo WSL was not found.
  echo Please open an Ubuntu/WSL terminal and run:
  echo   cd /home/zhangyuxin/smartplanner/SmartPlanner
  echo   node scripts/issue-license.mjs "SP-..." "label"
  echo.
  pause
  exit /b 1
)

rem Change these values if your WSL distro, user or project location is different.
set "WSL_DISTRO=Ubuntu"
set "WSL_USER=zhangyuxin"
set "WSL_SCRIPT=/home/zhangyuxin/smartplanner/SmartPlanner/scripts/issue-license.mjs"

wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -e test -f "%WSL_SCRIPT%" <nul >nul 2>nul
if errorlevel 1 (
  echo Cannot find issue-license.mjs in WSL:
  echo   %WSL_SCRIPT%
  echo.
  pause
  exit /b 1
)

echo Machine code format: SP-XXXX-XXXX-XXXX-XXXX-XXXX
set "MACHINE="
set /p "MACHINE=Enter machine code: "
if "%MACHINE%"=="" (
  echo Machine code is required.
  pause
  exit /b 1
)

set "LABEL="
set /p "LABEL=Enter label, optional: "
if "%LABEL%"=="" set "LABEL=Authorized User"

echo.
set "TMP_LICENSE=%PUBLIC%\smartplanner-license.txt"
wsl.exe -d %WSL_DISTRO% -u %WSL_USER% -e node "%WSL_SCRIPT%" "%MACHINE%" "%LABEL%" <nul > "%TMP_LICENSE%"
if errorlevel 1 goto fail
if not exist "%TMP_LICENSE%" goto fail

set "LICENSE="
for /f "usebackq delims=" %%i in ("%TMP_LICENSE%") do set "LICENSE=%%i"
del "%TMP_LICENSE%" >nul 2>nul

if not defined LICENSE goto fail
if not "%LICENSE:~0,4%"=="SP1." goto fail

echo Activation code:
echo.
echo %LICENSE%
echo.
echo %LICENSE% | clip >nul 2>nul
if errorlevel 1 (
  echo Copy failed. Please copy the code above manually.
) else (
  echo Copied to clipboard.
)
echo.
pause
exit /b 0

:fail
if defined TMP_LICENSE if exist "%TMP_LICENSE%" del "%TMP_LICENSE%" >nul 2>nul
echo Failed to generate the activation code. See the error above.
echo.
pause
exit /b 1
