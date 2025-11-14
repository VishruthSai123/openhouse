# Supabase Edge Functions for Razorpay Payment Integration

## Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Initialize Edge Functions
```bash
cd supabase
supabase functions new create-razorpay-order
supabase functions new verify-razorpay-payment
supabase functions new razorpay-webhook
```

### 3. Set Environment Variables in Supabase Dashboard
Go to: Settings → Edge Functions → Add secrets

```
RAZORPAY_TEST_KEY_ID=rzp_test_RZCalW8FnHhyFK
RAZORPAY_TEST_KEY_SECRET=xat1T5SykUzrUyJIaDYD1tBj
RAZORPAY_LIVE_KEY_ID=rzp_live_RYrMe7EXEQ4UMt
RAZORPAY_LIVE_KEY_SECRET=z4QE76BS32ttCLO2cTOyH764
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_from_razorpay
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Deploy Edge Functions
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

### 5. Configure Razorpay Webhook
Go to Razorpay Dashboard → Settings → Webhooks

**Webhook URL:**
```
https://zprhdjcmutpnoxzrhkmb.supabase.co/functions/v1/razorpay-webhook
```

**Events to Subscribe:**
- payment.authorized
- payment.captured  
- payment.failed

**Secret:** Use the same `RAZORPAY_WEBHOOK_SECRET` you set above

---

## Edge Function Files

Create these three files in `supabase/functions/` directory:
