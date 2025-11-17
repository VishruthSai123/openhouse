# Gemini API 404 Error - Troubleshooting

## The Error
"AI service error: 404" means the Gemini API endpoint is returning 404.

## Possible Causes

### 1. **Model Name Issue** (Most Likely)
The model `gemini-1.5-flash` might not be available for your API key.

**Try these model names instead:**
- `gemini-pro` (stable, most compatible)
- `gemini-1.5-pro` 
- `gemini-1.0-pro`

### 2. **API Endpoint Version**
Currently using: `/v1/models/gemini-1.5-flash:generateContent`

**Alternative endpoints:**
- `/v1beta/models/gemini-1.5-flash:generateContent` (beta version)
- `/v1/models/gemini-pro:generateContent` (stable)

### 3. **API Key Issues**
- Key might be restricted to specific models
- Key might be from old API Studio
- Key might need to be regenerated

## Quick Fixes to Try

### Fix 1: Change Model to gemini-pro
Edit `supabase/functions/idea-validator/index.ts` line 100:

**From:**
```typescript
`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
```

**To:**
```typescript
`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiApiKey}`
```

Then deploy:
```powershell
supabase functions deploy idea-validator
```

### Fix 2: Use v1beta endpoint
Keep gemini-1.5-flash but use beta endpoint:

```typescript
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`
```

### Fix 3: Get New API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Delete old key
3. Create new API key
4. Set it: `supabase secrets set GEMINI_API_KEY=new_key`
5. Deploy: `supabase functions deploy idea-validator`

## Test Which Model Works

Visit: https://aistudio.google.com/app/prompts/new_freeform

Try these models in the dropdown:
- If "Gemini 1.5 Flash" works → use `gemini-1.5-flash` with `/v1beta/`
- If only "Gemini Pro" works → use `gemini-pro` with `/v1/`

## Not Related To:
❌ Serper API (web search) - This is optional and non-blocking
❌ Vercel - You're not using Vercel, using Supabase Edge Functions
❌ Database - Error happens before database access
❌ Your code - The function is deployed correctly

## Related To:
✅ **Google Gemini API access and model availability**
