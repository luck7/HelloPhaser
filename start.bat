@echo off
echo ========================================
echo   Battle City - Starting Local Server
echo ========================================
echo.
echo Open your browser and go to:
echo   http://localhost:8080
echo.
echo Press Ctrl+C to stop the server.
echo.

start "" http://localhost:8080
python -m http.server 8080 2>nul || python3 -m http.server 8080 2>nul || npx serve -l 8080 2>nul || echo ERROR: No server found. Install Python or Node.js.
