@echo off
title Prajzo - create an administrator
cd /d "%~dp0"
echo Creating a Prajzo administrator account.
echo The password stays invisible while you type it. That is normal.
echo.
call npm run admin:create -w @prajzo/api
echo.
pause
