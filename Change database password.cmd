@echo off
title Prajzo - change the database password
cd /d "%~dp0"
echo Put a new MongoDB Atlas password into this computer's settings.
echo.
call npm run db:password -w @prajzo/api
echo.
pause
