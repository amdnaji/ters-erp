@echo off
title Ters ERP MSI Installer Builder
echo ====================================================================
echo   TERS ERP - MSI INSTALLER COMPILER
echo   Automated Publishing ^& Packaging Pipeline
echo ====================================================================
echo.

:: 1. Check/Install WiX Toolset
echo [1/4] Verifying WiX Toolset installation...
wix --version >nul 2>&1
if %errorlevel% equ 0 goto wix_ready

echo WiX tool is not installed globally. Installing via dotnet tool...
dotnet tool install --global wix
wix --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install WiX global tool!
    echo Please ensure you have internet access and dotnet SDK installed.
    pause
    exit /b 1
)

:wix_ready
echo WiX Toolset is installed and ready.
echo.

:: Accept WiX v7+ EULA to prevent WIX7015 compilation errors
wix eula accept wix7 >nul 2>&1

:: 2. Compile React Frontend
echo [2/4] Compiling React SPA frontend assets...
cd src\terserp.client
cmd.exe /c npm run build
if %errorlevel% neq 0 (
    echo [ERROR] React compilation failed!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..
echo React frontend compiled successfully.
echo.

:: 3. Publish Standalone win-x64 Release
echo [3/4] Publishing self-contained win-x64 standalone server and GUI launcher...
echo This embeds the .NET runtime directly inside the executable.
if exist publish rd /s /q publish
dotnet publish src\TersErp.Api\TersErp.Api.csproj -c Release -r win-x64 --self-contained true -o publish /p:PublishSingleFile=false /p:PublishReadyToRun=false >nul
if %errorlevel% neq 0 (
    echo [ERROR] Dotnet API publishing failed!
    pause
    exit /b 1
)
dotnet publish src\TersErp.Launcher\TersErp.Launcher.csproj -c Release -r win-x64 --self-contained true -o publish /p:PublishSingleFile=true /p:PublishReadyToRun=false >nul
if %errorlevel% neq 0 (
    echo [ERROR] Dotnet Launcher publishing failed!
    pause
    exit /b 1
)
echo Application and Launcher published to ./publish/ folder.
echo.

:: 4. Compile the MSI Installer Package with WixUI Extension
echo [4/4] Generating TersErpSetup.msi package using WiX...
if exist TersErpSetup.msi del TersErpSetup.msi

:: Ensure WiX extensions are installed globally
wix extension add WixToolset.UI.wixext >nul 2>&1
wix extension add WixToolset.Util.wixext >nul 2>&1

:: Build MSI package incorporating the extensions and enforcing 64-bit architecture
wix build setup.wxs -arch x64 -ext WixToolset.UI.wixext -ext WixToolset.Util.wixext -o TersErpSetup.msi
if %errorlevel% neq 0 (
    echo [ERROR] WiX MSI compilation failed!
    pause
    exit /b 1
)

:: Cleanup temp publish folder
rd /s /q publish

echo.
echo ====================================================================
echo   SUCCESS! Ters ERP MSI Installer has been generated.
echo   Output File: TersErpSetup.msi
echo ====================================================================
echo.
pause
