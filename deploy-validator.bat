@echo off
echo ====================================
echo Deploying Idea Validator Updates
echo ====================================
echo.

echo [1/3] Deploying Edge Function...
call supabase functions deploy idea-validator
if %errorlevel% neq 0 (
    echo ERROR: Function deployment failed!
    pause
    exit /b 1
)
echo.

echo [2/3] Checking function logs...
call supabase functions logs idea-validator --limit 10
echo.

echo [3/3] Testing function...
echo To test, visit: http://localhost:8081/idea-validator
echo.

echo ====================================
echo Deployment Complete!
echo ====================================
echo.
echo Next steps:
echo 1. Make sure API keys are set:
echo    supabase secrets set GEMINI_API_KEY=your_key
echo    supabase secrets set SERPER_API_KEY=your_key
echo.
echo 2. Test the validator in your browser
echo.
echo 3. Check logs if issues occur:
echo    supabase functions logs idea-validator --tail
echo.
pause
