@echo off
title Ters ERP Launcher (v0.1.0-beta.1)

echo ====================================================================
echo   TERS ERP SUITE - v0.1.0-beta.1
echo   Dynamic Local Trial ^& Developer Launcher
echo ====================================================================
echo   Built with love in Saudi Arabia
echo ====================================================================
echo.

:: Check for .NET 9 SDK
echo [1/4] Checking system prerequisites...
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] .NET 9 SDK is not installed on this system!
    echo Please install it from: https://dotnet.microsoft.com/download/dotnet/9.0
    echo.
    pause
    exit /b 1
)
echo .NET 9 SDK is installed and ready.
echo.

:: Ask the user for running mode
echo [2/4] Choose Launching Mode:
echo ----------------------------------------------------
echo [1] Single-Port Mode (SPA Integration) - Recommended
echo     * Frontend React app is compiled into the backend wwwroot.
echo     * The entire system runs on a single port (http://localhost:5080).
echo     * Extremely light, clean, and simulates the production SaaS build.
echo.
echo [2] Developer Mode (Parallel Dev Servers)
echo     * Runs two parallel live-reload servers.
echo     * Backend runs on http://localhost:5080.
echo     * Frontend React runs on http://localhost:5173 (with hot reloading).
----------------------------------------------------
set /p mode="Enter mode choice [1 or 2, default is 1]: "

if "%mode%"=="" set mode=1

if "%mode%"=="1" (
    echo.
    echo Launching Mode: Single-Port SPA Mode...
    echo.
    
    :: Build the frontend first to output to wwwroot
    echo [3/4] Compiling React SPA into Backend wwwroot...
    cd src\terserp.client
    cmd.exe /c npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend compilation failed!
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
    echo.

    :: Build backend
    echo [4/4] Building and Starting Backend Server on http://localhost:5080...
    dotnet build src\TersErp.Api\TersErp.Api.csproj -c Debug >nul
    if %errorlevel% neq 0 (
        echo [ERROR] Backend compilation failed!
        pause
        exit /b 1
    )

    :: Launch browser after 3 seconds
    start /b cmd /c "timeout /t 3 >nul && start http://localhost:5080"

    :: Run the API hosting the SPA
    dotnet run --project src\TersErp.Api\TersErp.Api.csproj --urls "http://localhost:5080"
) else (
    echo.
    echo Launching Mode: Parallel Developer Mode...
    echo.

    :: Start Backend Server in a new command window
    echo [3/4] Starting Backend API Server on http://localhost:5080...
    start "Ters Backend API Server" cmd.exe /c "dotnet run --project src\TersErp.Api\TersErp.Api.csproj --urls http://localhost:5080"
    
    :: Start Frontend Development Server in a new command window
    echo [4/4] Starting Frontend Vite Dev Server on http://localhost:5173...
    start "Ters Frontend Dev Server" cmd.exe /c "cd src\terserp.client && npm run dev"

    echo.
    echo ====================================================================
    echo   Ters ERP Servers are running!
    echo   * Backend API: http://localhost:5080
    echo   * Frontend UI: http://localhost:5173
    echo.
    echo   You can access the UI at: http://localhost:5173
    echo   (Vite Hot-Module-Replacement is enabled!)
    echo ====================================================================
    echo.
    
    :: Launch browser to frontend dev server
    start /b cmd /c "timeout /t 3 >nul && start http://localhost:5173"
)

pause
