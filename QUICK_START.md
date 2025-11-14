# 🚀 Quick Start - Razorpay Payment System

## ⚡ 3-Step Deployment

### **Step 1: Deploy Edge Functions** (5 min)
```powershell
supabase login
supabase link --project-ref zprhdjcmutpnoxzrhkmb
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

### **Step 2: Add Supabase Secrets** (2 min)
Dashboard → Settings → Edge Functions → Secrets:
```
RAZORPAY_TEST_KEY_ID=rzp_test_RZCalW8FnHhyFK
RAZORPAY_TEST_KEY_SECRET=xat1T5SykUzrUyJIaDYD1tBj
RAZORPAY_LIVE_KEY_ID=rzp_live_RYrMe7EXEQ4UMt
RAZORPAY_LIVE_KEY_SECRET=z4QE76BS32ttCLO2cTOyH764
RAZORPAY_WEBHOOK_SECRET=[from step 3]
SUPABASE_SERVICE_ROLE_KEY=[from Supabase Settings → API]
```

### **Step 3: Configure Webhook** (2 min)
Razorpay Dashboard → Settings → Webhooks:
- **URL:** `https://zprhdjcmutpnoxzrhkmb.supabase.co/functions/v1/razorpay-webhook`
- **Events:** payment.authorized, payment.captured, payment.failed
- **Secret:** Generate & add to Supabase as RAZORPAY_WEBHOOK_SECRET

---

## 🧪 Test Payment

### **Test Mode:**
```
Card: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
```

### **Switch Modes:**
```env
# In .env file
VITE_RAZORPAY_MODE="test"  # or "live"
```

---

## 📊 Verify Success

✅ User profile: `has_paid = true`  
✅ Builder coins: `100`  
✅ Payment record in `payments` table  
✅ User redirected to dashboard  

---

## 🐛 Debug Commands

```powershell
# View logs
supabase functions logs razorpay-webhook --follow

# Test webhook
# Go to Razorpay Dashboard → Webhooks → Send Test Webhook

# Check deployment
supabase functions list
```

---

## 📁 Key Files

- `src/pages/Payment.tsx` - Payment UI with Razorpay
- `supabase/functions/` - 3 edge functions
- `.env` - Razorpay configuration
- `DEPLOYMENT_GUIDE.md` - Full documentation

---

## ✨ Features

✅ Test & Live mode switching  
✅ Secure payment verification  
✅ Webhook redundancy  
✅ Automatic Builder Coins award  
✅ Payment status tracking  

---

**Total Time: ~10 minutes** 🎉
