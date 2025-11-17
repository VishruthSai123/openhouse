@echo off
echo ====================================
echo Test Gemini API Key
echo ====================================
echo.
echo This will test if your GEMINI_API_KEY works
echo.
pause
echo.
echo Fetching your API key from Supabase...
for /f "delims=" %%i in ('supabase secrets get GEMINI_API_KEY 2^>nul') do set GEMINI_KEY=%%i

if "%GEMINI_KEY%"=="" (
    echo ERROR: Could not retrieve GEMINI_API_KEY
    echo.
    echo Run this command to set it:
    echo supabase secrets set GEMINI_API_KEY=your_key_here
    pause
    exit /b 1
)

echo Key found! Testing...
echo.

REM Test with gemini-pro
echo Testing gemini-pro model...
curl -s -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=%GEMINI_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"contents\":[{\"parts\":[{\"text\":\"Say hello\"}]}]}" > test-response.json

findstr /C:"candidates" test-response.json >nul
if %errorlevel%==0 (
    echo ✓ gemini-pro works!
    echo.
    type test-response.json
    del test-response.json
    echo.
    echo ====================================
    echo SUCCESS! Your API key works.
    echo The validator should work now.
    echo ====================================
) else (
    echo ✗ gemini-pro failed
    echo.
    echo Response:
    type test-response.json
    del test-response.json
    echo.
    echo.
    echo Trying gemini-1.5-pro...
    curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=%GEMINI_KEY%" ^
      -H "Content-Type: application/json" ^
      -d "{\"contents\":[{\"parts\":[{\"text\":\"Say hello\"}]}]}" > test-response2.json
    
    findstr /C:"candidates" test-response2.json >nul
    if %errorlevel%==0 (
        echo ✓ gemini-1.5-pro works!
        echo.
        type test-response2.json
        del test-response2.json
        echo.
        echo ====================================
        echo Your key works with gemini-1.5-pro
        echo Need to update the function...
        echo ====================================
        pause
        echo.
        echo Would you like to update the function? (Y/N)
        set /p choice=
        if /i "%choice%"=="Y" (
            echo Updating function to use gemini-1.5-pro...
            REM This would need manual edit
            echo Please manually edit: supabase/functions/idea-validator/index.ts
            echo Change line 100 to use: gemini-1.5-pro with /v1beta/ endpoint
        )
    ) else (
        echo ✗ gemini-1.5-pro also failed
        echo.
        echo Response:
        type test-response2.json
        del test-response2.json
        echo.
        echo ====================================
        echo ERROR: API Key doesn't work
        echo ====================================
        echo.
        echo Solutions:
        echo 1. Get a NEW API key from: https://aistudio.google.com/app/apikey
        echo 2. Make sure you're NOT using makersuite.google.com
        echo 3. Check if you have API quota remaining
        echo.
        echo Then run:
        echo supabase secrets set GEMINI_API_KEY=your_new_key
        echo supabase functions deploy idea-validator
    )
)
echo.
pause
