@echo off
REM Milesight Scraper Launcher
REM This script is for educational purposes only.

echo ==========================================================
echo     Milesight Website Static HTML Scraper
echo ==========================================================
echo.
echo This scraper will:
echo 1. Get all public page URLs from sitemap.xml
echo 2. Download HTML content for each page
echo 3. Save as local static HTML files
echo.
echo Note: Please ensure Python and required dependencies are installed.
echo.
pause

echo.
echo Starting scraper...
echo.

cd /d "%~dp0"

REM Try to activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Virtual environment not found, using system Python...
)

scrapy crawl milesight

echo.
echo ==========================================================
echo Crawling finished! HTML files saved to output/ directory
echo ==========================================================
echo.
pause
