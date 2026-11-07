@echo off
title Prajzo - settings for the live site
cd /d "%~dp0"
echo Make the settings file for the live site on Hostinger.
echo.
call npm run hosting:settings -w @prajzo/api -- live
echo.
pause
