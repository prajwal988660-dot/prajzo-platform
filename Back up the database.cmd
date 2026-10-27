@echo off
title Prajzo - back up the database
cd /d "%~dp0"
echo Backing up the Prajzo database into apps\api\backups\
echo The backup holds customers' personal data: keep it private.
echo.
call npm run db:backup -w @prajzo/api
echo.
pause
