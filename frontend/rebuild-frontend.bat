@echo off
echo ========================================
echo  Rebuilding Frontend with Tailwind CSS
echo ========================================
echo.

echo [1/4] Stopping any running dev servers...
taskkill /F /IM node.exe 2>nul

echo [2/4] Clearing all caches...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist build rmdir /s /q build

echo [3/4] Rebuilding production build...
call npm run build

echo [4/4] Starting development server...
echo.
echo ========================================
echo  Frontend will open at http://localhost:3001
echo ========================================
echo.
start npm start

echo Done! Check your browser in 10 seconds.
timeout /t 3
