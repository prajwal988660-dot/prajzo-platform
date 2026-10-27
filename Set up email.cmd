@echo off
title Prajzo - set up email
cd /d "%~dp0"
echo Turn on real email sending from contact@prajzo.com.
echo The password stays invisible while you type it. That is normal.
echo.
call npm run mail:setup -w @prajzo/api
echo.
pause
