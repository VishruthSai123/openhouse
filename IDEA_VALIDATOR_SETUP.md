# Idea Validator Setup Guide

## Overview
The Idea Validator feature uses AI (Google Gemini) and web search (Serper API) to validate startup ideas with real-time market research and honest feedback.

## Components Created
1. **Edge Function**: `supabase/functions/idea-validator/index.ts`
   - Integrates Gemini 1.5 Flash for AI validation
   - Uses Serper API for Google search results
   - Handles conversation history and context injection

2. **React Component**: `src/pages/IdeaValidator.tsx`
   - Chat interface with message history
   - Quick prompts for common questions
   - Real-time streaming responses
   - Mobile-responsive design

3. **Routing**: Added `/idea-validator` route in `App.tsx`

4. **Dashboard Link**: Added "Validate Idea" quick action card

## Setup Instructions

### Step 1: Get API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key" or "Create API Key"
3. Copy the API key (starts with `AIza...`)

#### Serper API Key
1. Go to [serper.dev](https://serper.dev)
2. Sign up for a free account (100 free searches)
3. Go to API Keys section
4. Copy your API key

### Step 2: Configure Supabase Secrets

Run these commands in PowerShell (from project root):

```powershell
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref pdwouvcolgixhtilcnvr

# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Set Serper API key
supabase secrets set SERPER_API_KEY=your_serper_api_key_here
```

Replace `your_gemini_api_key_here` and `your_serper_api_key_here` with your actual keys.

### Step 3: Deploy Edge Function

```powershell
# Deploy the function
supabase functions deploy idea-validator

# Verify deployment
supabase functions list
```

### Step 4: Test the Feature

1. Start your development server:
   ```powershell
   npm run dev
   ```

2. Navigate to the Dashboard
3. Click "Validate Idea" card
4. Start chatting with the AI about your startup idea

## Testing Locally (Optional)

To test the Edge Function locally before deployment:

```powershell
# Set environment variables locally
$env:GEMINI_API_KEY="your_gemini_api_key_here"
$env:SERPER_API_KEY="your_serper_api_key_here"

# Serve functions locally
supabase functions serve idea-validator

# In another terminal, start dev server
npm run dev
```

Note: You'll need to update the function invocation URL in the code to point to `http://localhost:54321/functions/v1/idea-validator` for local testing.

## How It Works

1. **User sends message**: User describes their idea or asks a question
2. **Web search triggered**: Function searches Google for latest market data using Serper API
3. **Context injection**: Search results are formatted and added to the AI prompt
4. **AI validation**: Gemini processes the conversation history + web context
5. **Response returned**: AI provides honest, data-backed feedback

## System Prompt

The AI acts as an expert startup validator with these characteristics:
- Brutally honest feedback (no sugarcoating)
- Data-driven analysis using web search results
- Actionable recommendations
- Market viability assessment
- Competition analysis
- Risk identification

## API Costs

### Gemini 1.5 Flash
- **Free Tier**: 15 requests/minute, 1M requests/day
- **Paid**: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Extremely cost-effective for this use case

### Serper API
- **Free Tier**: 100 searches/month
- **Paid Plans**: Starting at $5/month for 1000 searches
- Each idea validation triggers 1 search (if needed)

## Troubleshooting

### Error: "Failed to get response"
- **Check API keys**: Verify both keys are set correctly in Supabase secrets
- **Check deployment**: Ensure function is deployed (`supabase functions list`)
- **Check logs**: View function logs with `supabase functions logs idea-validator`

### Error: "CORS error"
- Edge function includes CORS headers automatically
- If issue persists, check browser console for specific error

### No web context in responses
- Verify Serper API key is valid
- Check Serper API quota hasn't been exceeded
- View function logs for search API errors

## Feature Enhancements (Future)

- [ ] Save validation sessions to database
- [ ] Export validation reports as PDF
- [ ] Compare multiple ideas side-by-side
- [ ] Suggest pivots/improvements based on feedback
- [ ] Track validation history per user
- [ ] Add voice input for idea description
- [ ] Integration with Ideas Hub (validate before posting)

## Security Notes

- API keys are stored as Supabase secrets (encrypted)
- Edge Functions run server-side (keys never exposed to client)
- RLS policies should be added if saving conversations to database
- Rate limiting recommended for production (prevent abuse)

## Support

If you encounter issues:
1. Check function logs: `supabase functions logs idea-validator --tail`
2. Verify API keys are set: `supabase secrets list`
3. Test with simple query first: "Validate my idea: AI-powered task manager"
