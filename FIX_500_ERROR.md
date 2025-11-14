# 🚨 500 Error Fix - Add Supabase Secrets

## Problem
```
POST https://zprhdjcmutpnoxzrhkmb.supabase.co/functions/v1/create-razorpay-order 500 (Internal Server Error)
Error: Edge Function returned a non-2xx status code
```

## Root Cause
**Razorpay credentials are NOT configured in Supabase Dashboard.**

The edge function is deployed but cannot access the environment variables (secrets) it needs.

---

## ✅ Solution: Add Secrets in Supabase Dashboard

### **Step 1: Open Supabase Dashboard**
Go to: https://supabase.com/dashboard/project/zprhdjcmutpnoxzrhkmb

### **Step 2: Navigate to Edge Functions Secrets**
1. Click **"Settings"** in left sidebar (⚙️ icon at bottom)
2. Click **"Edge Functions"** in the settings menu
3. Scroll down to **"Function Secrets"** section

### **Step 3: Add These 6 Secrets**

Click **"Add New Secret"** for each:

#### **Secret 1:**
- **Name:** `RAZORPAY_TEST_KEY_ID`
- **Value:** `rzp_test_RZCalW8FnHhyFK`
- Click **"Add Secret"**

#### **Secret 2:**
- **Name:** `RAZORPAY_TEST_KEY_SECRET`
- **Value:** `xat1T5SykUzrUyJIaDYD1tBj`
- Click **"Add Secret"**

#### **Secret 3:**
- **Name:** `RAZORPAY_LIVE_KEY_ID`
- **Value:** `rzp_live_RYrMe7EXEQ4UMt`
- Click **"Add Secret"**

#### **Secret 4:**
- **Name:** `RAZORPAY_LIVE_KEY_SECRET`
- **Value:** `z4QE76BS32ttCLO2cTOyH764`
- Click **"Add Secret"**

#### **Secret 5:**
- **Name:** `RAZORPAY_WEBHOOK_SECRET`
- **Value:** `Vishruth2008`
- Click **"Add Secret"**

#### **Secret 6:**
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Get from **Settings → API → Project API keys → service_role**
- Copy the `service_role` key (starts with `eyJ...`)
- Click **"Add Secret"**

---

## 🔍 Visual Guide

```
Supabase Dashboard
    ↓
Settings (bottom left)
    ↓
Edge Functions
    ↓
Scroll to "Function Secrets"
    ↓
Click "Add New Secret" button
    ↓
Enter Name and Value (NO QUOTES)
    ↓
Click "Add Secret"
    ↓
Repeat for all 6 secrets
```

---

## ⚠️ Important Notes

### **DO NOT include quotes:**
- ❌ Wrong: `"rzp_test_RZCalW8FnHhyFK"`
- ✅ Correct: `rzp_test_RZCalW8FnHhyFK`

### **Copy-paste carefully:**
- No extra spaces
- No line breaks
- Exact values as shown above

### **Service Role Key:**
To get this:
1. Settings → API
2. Look for "Project API keys"
3. Find the row with "service_role"
4. Click the eye icon to reveal
5. Click copy icon
6. Paste as value for `SUPABASE_SERVICE_ROLE_KEY`

---

## 🧪 Test After Adding Secrets

### **Step 1: Wait 30 seconds**
Secrets take a moment to propagate.

### **Step 2: Test Payment**
1. Go to your app: http://localhost:8080/payment
2. Open browser console (F12)
3. Click "Pay ₹100"
4. Check console logs

### **Expected Output:**
```
Calling create-razorpay-order function...
Edge function response: {
  orderData: {
    success: true,
    orderId: "order_xxxxx",
    amount: 10000,
    currency: "INR"
  },
  orderError: null
}
```

### **If Still 500 Error:**
1. Double-check all 6 secrets are added correctly
2. Wait another 30 seconds
3. Refresh the page
4. Try again

---

## 📋 Checklist

Before testing, verify:

- [ ] All 6 secrets added in Supabase Dashboard
- [ ] No quotes around values
- [ ] No extra spaces or line breaks
- [ ] Service role key is correct (long string starting with `eyJ`)
- [ ] Waited 30 seconds after adding secrets
- [ ] Refreshed browser page

---

## 🎯 Quick Copy-Paste Reference

```
RAZORPAY_TEST_KEY_ID=rzp_test_RZCalW8FnHhyFK
RAZORPAY_TEST_KEY_SECRET=xat1T5SykUzrUyJIaDYD1tBj
RAZORPAY_LIVE_KEY_ID=rzp_live_RYrMe7EXEQ4UMt
RAZORPAY_LIVE_KEY_SECRET=z4QE76BS32ttCLO2cTOyH764
RAZORPAY_WEBHOOK_SECRET=Vishruth2008
SUPABASE_SERVICE_ROLE_KEY=[Get from Settings → API]
```

---

## 🔗 Direct Links

**Your Project Dashboard:**
https://supabase.com/dashboard/project/zprhdjcmutpnoxzrhkmb

**Edge Functions Settings:**
https://supabase.com/dashboard/project/zprhdjcmutpnoxzrhkmb/settings/functions

**API Keys (for service_role):**
https://supabase.com/dashboard/project/zprhdjcmutpnoxzrhkmb/settings/api

---

## ✅ Success Indicators

After adding secrets correctly:

1. **500 error disappears**
2. **Console shows:** `orderData: { success: true, orderId: "order_xxx" }`
3. **Razorpay modal opens**
4. **Payment can be completed**

---

## 🆘 Still Not Working?

### **Option 1: Redeploy Edge Function**
```powershell
supabase functions deploy create-razorpay-order
```

### **Option 2: Check Secret Names**
- Names must be EXACT (case-sensitive)
- No typos
- No extra underscores or spaces

### **Option 3: Verify in Dashboard**
Go back to Edge Functions settings and verify all 6 secrets are listed.

---

**Add these secrets and your payment will work! 🚀**
