// Quick test to verify Supabase connection
// Run this with: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pdwouvcolgixhtilcnvr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd291dmNvbGdpeGh0aWxjbnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTgxNjgsImV4cCI6MjA3NjM5NDE2OH0.Q4ha6a3FoLSe0DVQzwjMNtLYUzUHjcvX3lYJhC_hnF4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("🔍 Testing Supabase Connection...\n");
console.log("Project URL:", SUPABASE_URL);

// Test 1: Check if we can connect
supabase.from('profiles').select('count').then(({ data, error }) => {
  if (error) {
    console.log("❌ Connection Error:", error.message);
  } else {
    console.log("✅ Successfully connected to Supabase!");
    console.log("📊 Database is responding");
  }
}).catch(err => {
  console.log("❌ Network Error:", err.message);
});

// Test 2: Get project info
console.log("\n📍 Project Details:");
console.log("   Project ID: pdwouvcolgixhtilcnvr");
console.log("   Region: Check dashboard for region info");
console.log("   Dashboard URL: https://supabase.com/dashboard/project/pdwouvcolgixhtilcnvr");
