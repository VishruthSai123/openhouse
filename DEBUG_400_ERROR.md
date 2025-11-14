# 🔍 Quick Debugging Guide - 400 Error Resolution

## Problem Summary
**Error:** `Failed to load resource: the server responded with a status of 400`
**Location:** Edge function `create-razorpay-order`

---

## ✅ FIXES APPLIED

### 1. **Enhanced Edge Function Logging**
Now you'll see detailed logs in Supabase:
```
=== Create Razorpay Order Request ===
Request body: {"amount":100,"userId":"...","isTestMode":true}
Processing order for user: xxx, amount: 100, mode: test
Using TEST credentials
Key ID present: true
Key Secret present: true
Calling Razorpay API...
Razorpay API response status: 200
Order created successfully: order_xxx
```

### 2. **Better Error Messages**
Specific errors instead of generic "400":
- "Missing required parameter: amount"
- "Missing required parameter: userId"
- "Payment gateway not configured"
- "Razorpay API error: [specific error]"

### 3. **Frontend Error Handling**
```tsx
// Now checks for success field
if (!orderData?.success) {
  throw new Error(orderData?.error || 'Failed to create order');
}

// Categorized error messages
if (error.message?.includes('credentials')) {
  // Shows: "Payment gateway is not properly configured"
}
```

### 4. **Error Boundary**
Catches any React errors and shows beautiful error UI

---

## 🔧 How to Debug

### **Step 1: Open Supabase Logs**
```powershell
supabase functions logs create-razorpay-order --follow
```

### **Step 2: Open Browser Console (F12)**
- Go to Console tab
- Click "Pay ₹100"
- Watch for logs:
  - ✅ "Calling create-razorpay-order function..."
  - ✅ "Edge function response: {...}"

### **Step 3: Check the Error Message**

#### **If you see: "Payment gateway not configured"**
**FIX:**
1. Go to Supabase Dashboard
2. Settings → Edge Functions → Secrets
3. Add these secrets (NO quotes):
```
RAZORPAY_TEST_KEY_ID=rzp_test_RZCalW8FnHhyFK
RAZORPAY_TEST_KEY_SECRET=xat1T5SykUzrUyJIaDYD1tBj
RAZORPAY_LIVE_KEY_ID=rzp_live_RYrMe7EXEQ4UMt
RAZORPAY_LIVE_KEY_SECRET=z4QE76BS32ttCLO2cTOyH764
```

#### **If you see: "Missing required parameter"**
**FIX:**
- This means the frontend isn't sending correct data
- Check Payment.tsx line where edge function is called
- Should send: `{ amount: 100, userId: user.id, isTestMode: true/false }`

#### **If you see: "Razorpay API error"**
**FIX:**
- Check Razorpay Dashboard
- Verify your keys are active
- Check if account has any restrictions

---

## 🎯 Quick Test

### **1. Deploy Edge Function:**
```powershell
supabase functions deploy create-razorpay-order
```

### **2. Test Payment:**
1. Open app: `http://localhost:8080`
2. Sign up / Login
3. Complete onboarding
4. Go to payment page
5. Open browser console (F12)
6. Click "Pay ₹100"
7. Check console logs

### **3. Expected Console Output:**
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

---

## 🚨 Common Issues & Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Payment gateway not configured" | Missing Supabase secrets | Add secrets in Dashboard |
| "Missing required parameter: userId" | User not logged in | Check auth status |
| "Network Error" | Edge function not deployed | Run `supabase functions deploy` |
| "Invalid request body" | Malformed JSON | Check frontend code |
| "Razorpay API error: Invalid key" | Wrong credentials | Verify keys in Razorpay Dashboard |

---

## 📊 Detailed Error Logs Location

### **Supabase Logs:**
Dashboard → Logs → Edge Functions → create-razorpay-order

### **Browser Console:**
F12 → Console tab → Look for:
- Red errors
- Orange warnings
- Blue info logs

### **Network Tab:**
F12 → Network → Filter "create-razorpay-order" → Click → Preview/Response

---

## ✅ Verification Checklist

After fixes:

- [ ] Edge function deployed successfully
- [ ] Supabase secrets added (4 Razorpay keys)
- [ ] Browser console shows detailed logs
- [ ] No 400 errors in network tab
- [ ] Razorpay checkout opens
- [ ] Can complete test payment

---

## 🎉 Success Indicators

You'll know it's working when:

1. **Console shows:**
   ```
   Calling create-razorpay-order function...
   Edge function response: { orderData: { success: true, ... }, orderError: null }
   ```

2. **Razorpay modal opens** with payment form

3. **No red errors** in console

4. **Network tab** shows 200 response for edge function

---

## 📞 Still Having Issues?

### **Check in this order:**

1. ✅ Edge function deployed?
   ```powershell
   supabase functions list
   ```

2. ✅ Secrets added in Supabase?
   Dashboard → Settings → Edge Functions → Secrets

3. ✅ Keys valid in Razorpay?
   Razorpay Dashboard → Settings → API Keys

4. ✅ Frontend .env correct?
   ```env
   VITE_RAZORPAY_MODE="test"
   VITE_RAZORPAY_TEST_KEY_ID="rzp_test_..."
   ```

5. ✅ Dev server restarted?
   ```powershell
   Ctrl+C
   npm run dev
   ```

---

**All errors should now be clear and actionable! 🎯**
