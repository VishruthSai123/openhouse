@echo off
echo ====================================
echo Gemini API Key Setup
echo ====================================
echo.
echo Step 1: Get a NEW Gemini API Key
echo.
echo 1. Visit: https://makersuite.google.com/app/apikey
echo 2. Click "Create API Key"
echo 3. Copy the key (starts with AIza...)
echo.
echo Step 2: Set the key in Supabase
echo.
set /p GEMINI_KEY="Paste your Gemini API key here: "
echo.
echo Setting Gemini API key...
call supabase secrets set GEMINI_API_KEY=%GEMINI_KEY%
echo.
echo Step 3: Redeploy function
echo.
call supabase functions deploy idea-validator
echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Test by sending a message in the validator
echo.
pause
