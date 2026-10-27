@echo off
title Prajzo - settings for the staging site
cd /d "%~dp0"
echo Make the settings file for the staging site on Render.
echo.
call npm run hosting:settings -w @prajzo/api -- staging
echo.
pause
