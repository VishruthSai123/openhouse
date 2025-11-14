# 🚀 Open House Platform - Quick Deployment Guide

## ✅ What's Complete

### **Phase 1: Foundation (100% Complete)**
- ✅ User Authentication (Supabase Auth)
- ✅ 3-Step Onboarding Flow
- ✅ Functional Dashboard
- ✅ Razorpay Payment Integration (Test + Live mode)
- ✅ Database Schema (8 migrations)
- ✅ Edge Functions (Payment processing)

---

## 📋 Pre-Deployment Checklist

### **1. Environment Variables (.env)**
```env
# Supabase
VITE_SUPABASE_URL="https://zprhdjcmutpnoxzrhkmb.supabase.co"
VITE_SUPABASE_ANON_KEY="your_anon_key"

# Razorpay Frontend
VITE_RAZORPAY_MODE="test"  # or "live"
VITE_RAZORPAY_TEST_KEY_ID="rzp_test_RZCalW8FnHhyFK"
VITE_RAZORPAY_LIVE_KEY_ID="rzp_live_RYrMe7EXEQ4UMt"
```

### **2. Supabase Edge Function Secrets**
Go to: **Supabase Dashboard → Settings → Edge Functions → Add Secrets**

```bash
RAZORPAY_TEST_KEY_ID=rzp_test_RZCalW8FnHhyFK
RAZORPAY_TEST_KEY_SECRET=xat1T5SykUzrUyJIaDYD1tBj
RAZORPAY_LIVE_KEY_ID=rzp_live_RYrMe7EXEQ4UMt
RAZORPAY_LIVE_KEY_SECRET=z4QE76BS32ttCLO2cTOyH764
RAZORPAY_WEBHOOK_SECRET=[Get from Razorpay Dashboard after webhook setup]
SUPABASE_SERVICE_ROLE_KEY=[From Supabase Settings → API → service_role]
```

---

## 🔥 Quick Deploy Steps

### **Step 1: Deploy Edge Functions** (5 minutes)
```powershell
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref zprhdjcmutpnoxzrhkmb

# Deploy functions
cd supabase/functions
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment  
supabase functions deploy razorpay-webhook
```

### **Step 2: Configure Razorpay Webhook** (2 minutes)
1. Go to: **Razorpay Dashboard → Settings → Webhooks**
2. Click **"+ Add New Webhook"**
3. **URL:** `https://zprhdjcmutpnoxzrhkmb.supabase.co/functions/v1/razorpay-webhook`
4. **Events:** 
   - ✅ payment.authorized
   - ✅ payment.captured
   - ✅ payment.failed
5. **Secret:** Generate random string, add to Supabase secrets as `RAZORPAY_WEBHOOK_SECRET`
6. **Save**

### **Step 3: Test Payment Flow** (3 minutes)

#### **Test Mode:**
1. Set `VITE_RAZORPAY_MODE="test"` in `.env`
2. Restart dev server: `npm run dev`
3. Sign up → Complete onboarding → Payment page
4. Use test card: `4111 1111 1111 1111` | Any future expiry | Any CVV
5. Verify: User profile `has_paid = true`, 100 Builder Coins awarded

#### **Live Mode:**
1. Set `VITE_RAZORPAY_MODE="live"` in `.env`
2. Restart dev server
3. Complete real payment

---

## 📊 Database Status

### **Tables Created (8 Migrations):**
1. ✅ `profiles` - Extended with onboarding & payment fields
2. ✅ `payments` - Payment records & status
3. ✅ `ideas` - User ideas with votes
4. ✅ `idea_comments` - Comments on ideas
5. ✅ `idea_votes` - Upvote tracking
6. ✅ `projects` - Build Spaces
7. ✅ `coin_transactions` - Gamification system
8. ✅ `achievements` - User achievements

**To verify all migrations ran:**
```sql
-- Check in Supabase SQL Editor
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

---

## 🎯 User Flow (Current)

```
New User
   ↓
Sign Up/Login (Auth.tsx)
   ↓
3-Step Onboarding (Onboarding.tsx)
   - Role Selection (6 roles)
   - Skills & Interests
   - Social Links
   ↓
Payment Page (Payment.tsx)
   - ₹100 one-time fee
   - Test/Live mode toggle
   - Razorpay integration
   ↓
Dashboard (Dashboard.tsx)
   - Stats: Ideas, Projects, Connections
   - Builder Coins display
   - Quick actions
   - Navigation to all features
```

---

## 🧪 Testing Commands

### **Test Edge Functions Locally (Optional):**
```powershell
# Start Supabase locally
supabase start

# Serve edge function
supabase functions serve create-razorpay-order --env-file ./supabase/.env.local
```

### **Check Logs:**
```powershell
# View edge function logs
supabase functions logs create-razorpay-order
supabase functions logs verify-razorpay-payment
supabase functions logs razorpay-webhook
```

---

## 🔍 Debugging

### **Payment not working?**
```powershell
# Check edge function deployment
supabase functions list

# View real-time logs
supabase functions logs razorpay-webhook --follow

# Test webhook in Razorpay Dashboard
# Dashboard → Webhooks → Your webhook → Send Test Webhook
```

### **Types not matching?**
```powershell
# Regenerate Supabase types
npx supabase gen types typescript --project-id zprhdjcmutpnoxzrhkmb > src/integrations/supabase/types.ts
```

---

## 📦 Production Deployment (Vercel)

### **Option 1: GitHub + Vercel (Recommended)**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### **Option 2: Vercel CLI**
```powershell
npm install -g vercel
vercel --prod
```

**Environment Variables to Add in Vercel:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_RAZORPAY_MODE
VITE_RAZORPAY_TEST_KEY_ID
VITE_RAZORPAY_LIVE_KEY_ID
```

---

## 🎊 Success Indicators

- ✅ Dev server running at `localhost:8080`
- ✅ No TypeScript errors
- ✅ All 8 database migrations ran
- ✅ Edge functions deployed (3/3)
- ✅ Razorpay webhook configured
- ✅ Test payment works
- ✅ User onboarding flow complete
- ✅ Dashboard displays correctly
- ✅ Builder coins awarded on payment

---

## 🚀 Next Steps (Phase 2)

After confirming Phase 1 works:

1. **Idea Hub** - Browse, create, vote on ideas
2. **Co-Founder Matching** - Find team members
3. **Build Spaces** - Project collaboration
4. **Mentorship System** - Book sessions with mentors
5. **Idea Battle Arena** - Weekly competitions
6. **Full Gamification** - Achievements, leaderboards

---

## 📞 Quick Commands Reference

```powershell
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# Supabase
supabase functions deploy      # Deploy all functions
supabase functions list        # List deployed functions
supabase functions logs <name> # View function logs

# Razorpay Test Cards
# Visa: 4111 1111 1111 1111
# Mastercard: 5555 5555 5555 4444
# Amex: 3782 822463 10005
```

---

**🎉 Your Open House platform is ready to go live!**
