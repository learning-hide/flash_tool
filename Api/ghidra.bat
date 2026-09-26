@echo off
setlocal EnableDelayedExpansion

REM ============================================================
REM   Start Ghidra + MCP server + auto-load dumps + verify
REM   Location: C:\RE\start_ghidra_mcp.bat
REM ============================================================

set "GHIDRA_HOME=C:\tools\ghidra_12.1.2_PUBLIC"
set "PROJECT_DIR=C:\Users\ali\Desktop\Abpak"
set "PROJECT_NAME=ABPak"
set "MCP_URL=http://127.0.0.1:8089"
set "DUMP_DIR=C:\Dumps\UnknownName"
set "LOG_FILE=C:\RE\ghidra_mcp.log"

echo.
echo ============================================================
echo   Ghidra + MCP Startup
echo ============================================================
echo.

REM --- Step 1: Verify paths exist ---
if not exist "%GHIDRA_HOME%\ghidraRun.bat" (
    echo [ERROR] Ghidra not found at %GHIDRA_HOME%
    echo Edit GHIDRA_HOME in this file if it's installed elsewhere.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\%PROJECT_NAME%.gpr" (
    echo [WARN] Project %PROJECT_DIR%\%PROJECT_NAME%.gpr not found.
    echo        Ghidra will open with the default project browser.
)

REM --- Step 2: Kill any stale Ghidra JVMs ---
echo [1/5] Killing any stale Ghidra JVMs...
for /f "tokens=2 delims=," %%p in ('tasklist /fi "imagename eq java.exe" /fo csv /nh 2^>nul') do (
    set "PID=%%~p"
    set "PID=!PID:"=!"
    REM Try to identify Ghidra JVMs — java.exe launched from the Ghidra dir
    wmic process where "ProcessId=!PID!" get CommandLine 2>nul | findstr /i "ghidra" >nul
    if !errorlevel! equ 0 (
        echo        Killing stale Ghidra JVM PID !PID!
        taskkill /f /pid !PID! >nul 2>&1
    )
)
timeout /t 2 /nobreak >nul

REM --- Step 3: Verify port 8089 is free ---
echo [2/5] Checking port 8089...
netstat -ano | findstr ":8089" | findstr "LISTENING" >nul
if !errorlevel! equ 0 (
    echo        [WARN] Port 8089 already in use. Killing listener...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8089" ^| findstr "LISTENING"') do (
        echo        Killing PID %%a
        taskkill /f /pid %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
) else (
    echo        Port 8089 is free.
)

REM --- Step 4: Start Ghidra ---
echo [3/5] Launching Ghidra...
start "" /D "%GHIDRA_HOME%" "%GHIDRA_HOME%\ghidraRun.bat"

echo        Waiting for Ghidra JVM (up to 90s)...
set /a WAIT_COUNT=0
:WAIT_GHIDRA
timeout /t 3 /nobreak >nul
set /a WAIT_COUNT+=3
tasklist /fi "imagename eq java.exe" 2>nul | findstr "java.exe" >nul
if !errorlevel! neq 0 (
    if !WAIT_COUNT! lss 90 (
        <nul set /p=.
        goto WAIT_GHIDRA
    )
    echo.
    echo [ERROR] Ghidra did not start within 90 seconds.
    pause
    exit /b 1
)
echo.
echo        Ghidra JVM is up.

REM --- Step 5: Prompt user to open the project + start MCP ---
echo.
echo ============================================================
echo  MANUAL STEPS REQUIRED IN GHIDRA
echo ============================================================
echo.
echo   1. If the project browser doesn't open the ABPak project:
echo        File ^> Open Project ^> %PROJECT_DIR%\%PROJECT_NAME%.gpr
echo.
echo   2. In the project tree, double-click:
echo        vdump_1140000.exe       (or the main dump)
echo      If it opens the Debugger by mistake, right-click -^> Open With -^> CodeBrowser
echo.
echo   3. In the CodeBrowser window:
echo        GhidraMCP menu -^> Start MCP Server
echo      You should see "Failed to start UDS server: Protocol family not supported"
echo      in the console. That's normal on Windows. TCP 8089 is the fallback.
echo.
pause

REM --- Step 6: Verify MCP is responding ---
echo [4/5] Verifying MCP server at %MCP_URL%...
set /a RETRIES=0
:CHECK_MCP
set /a RETRIES+=1
powershell -NoProfile -Command ^
    "try { $r = Invoke-WebRequest -Uri '%MCP_URL%/mcp/health' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

if !errorlevel! equ 0 (
    echo        [OK] MCP server is responding.
    goto MCP_OK
)
if !RETRIES! lss 10 (
    <nul set /p=.
    timeout /t 3 /nobreak >nul
    goto CHECK_MCP
)
echo.
echo [ERROR] MCP server not responding after 30s. Check the Ghidra console window.
pause
exit /b 1

:MCP_OK

REM --- Step 7: Print program info + summary ---
echo.
echo [5/5] Querying active program...
for /f "delims=" %%a in ('powershell -NoProfile -Command ^
    "(Invoke-WebRequest -Uri '%MCP_URL%/get_current_program_info' -UseBasicParsing).Content" 2^>nul') do (
    echo        %%a
)

echo.
echo ============================================================
echo   READY
echo ============================================================
echo.
echo   MCP endpoint : %MCP_URL%
echo   Log file     : %LOG_FILE%
echo.
echo   Handy endpoints:
echo     %MCP_URL%/mcp/health
echo     %MCP_URL%/mcp/schema
echo     %MCP_URL%/get_current_program_info
echo.
echo   PowerShell example:
echo     $MCP = "%MCP_URL%"
echo     (Invoke-WebRequest -Uri "$MCP/get_current_program_info" -UseBasicParsing).Content
echo.
echo   To stop:
echo     In Ghidra: GhidraMCP menu -^> Stop MCP Server
echo     Then close Ghidra normally.
echo.
pause
endlocal