# Cloud Functions Setup Guide

This guide will help you set up secure Cloud Functions for UPC lookups, keeping API keys server-side.

## Why Use Cloud Functions?

**Security Benefits:**
- ✅ API keys stay on the server (never exposed to clients)
- ✅ Implement rate limiting and authentication
- ✅ Monitor and log all API usage
- ✅ Cache results to reduce API calls
- ✅ Rotate API keys without redeploying client code

**Before Cloud Functions:**
```
Client → Direct API Call with exposed key → UPC API
❌ API key visible in browser
❌ No rate limiting
❌ No centralized logging
```

**After Cloud Functions:**
```
Client → Cloud Function (authenticated) → UPC API
✅ API key secure on server
✅ Rate limiting enabled
✅ Centralized logging and monitoring
```

---

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged in to Firebase:**
   ```bash
   firebase login
   ```

3. **Firebase project must be on Blaze (pay-as-you-go) plan:**
   - Cloud Functions require outbound network access (not available on free tier)
   - Visit: https://console.firebase.google.com/project/YOUR_PROJECT/usage/details
   - Upgrade to Blaze plan (very low cost for typical usage)

---

## Step 1: Install Dependencies

Install Cloud Functions dependencies:

```bash
cd functions
npm install
cd ..
```

Install Firebase Functions SDK in your main app (if not already installed):

```bash
npm install firebase-functions
```

---

## Step 2: Configure Environment Variables

### For Local Development (Emulator)

1. Copy the example file:
   ```bash
   cd functions
   cp .env.example .env
   ```

2. Edit `functions/.env` and add your API keys:
   ```env
   GO_UPC_API_KEY=your-actual-go-upc-key
   UPCITEMDB_API_KEY=your-actual-upcitemdb-key
   ```

3. **Important:** Never commit `.env` files! Already in `.gitignore`.

### For Production Deployment

Use Firebase Secrets (recommended):

```bash
# Set Go-UPC API key
firebase functions:secrets:set GO_UPC_API_KEY
# When prompted, paste your API key and press Enter twice

# Set UPCItemDB API key (optional)
firebase functions:secrets:set UPCITEMDB_API_KEY
```

Or use the `.env` approach (functions will load `.env` on deploy):

```bash
# Ensure functions/.env exists with your keys
cd functions
cat .env  # Verify keys are set

# Deploy (will upload .env securely)
cd ..
firebase deploy --only functions
```

---

## Step 3: Enable Cloud Functions in Client

Update your `.env.local` in the project root:

```env
# Enable Cloud Functions for secure API lookups
VITE_USE_CLOUD_FUNCTIONS=true

# These keys are NO LONGER NEEDED when Cloud Functions are enabled
# VITE_GOUPC_API_KEY=  (not needed)
# VITE_UPCITEMDB_KEY=  (not needed)

# Keep other settings
VITE_ALLOWED_EMAIL_DOMAIN=bluelinxco.com
```

---

## Step 4: Test Locally with Emulator

Test Cloud Functions locally before deploying:

```bash
# Start the Firebase emulators
firebase emulators:start

# In another terminal, run your dev server
npm run dev
```

**Access your app at:** http://localhost:5173
**Functions emulator:** http://localhost:5001
**Functions logs:** Will appear in the terminal running emulators

**Test the UPC lookup:**
1. Sign in to your app
2. Go to Inventory → Add Inventory
3. Enter a UPC code (e.g., `885909950805`)
4. Click "Lookup"
5. Check emulator logs for function execution

---

## Step 5: Deploy to Production

### Deploy Functions Only

```bash
# Build and deploy Cloud Functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Deploy Everything (Hosting + Functions)

```bash
# Build your app
npm run build

# Deploy everything
firebase deploy
```

**Deployment time:** 2-5 minutes for first deploy, <1 minute for updates.

---

## Step 6: Verify Production Deployment

1. **Check Functions are deployed:**
   ```bash
   firebase functions:list
   ```

   Should show:
   ```
   ✓ lookupUPC(us-central1)
   ✓ healthCheck(us-central1)
   ```

2. **Test in production:**
   - Visit your deployed app: https://YOUR_PROJECT.web.app
   - Try a UPC lookup
   - Should work seamlessly!

3. **View logs:**
   ```bash
   # Real-time logs
   firebase functions:log

   # Or view in console
   # https://console.firebase.google.com/project/YOUR_PROJECT/functions/logs
   ```

---

## Monitoring and Maintenance

### View Function Metrics

Visit: https://console.firebase.google.com/project/YOUR_PROJECT/functions/list

**Monitor:**
- Invocations (requests per minute)
- Execution time (median, 95th percentile)
- Memory usage
- Error rate
- Billing

### Set Up Alerts

1. Go to Cloud Console: https://console.cloud.google.com
2. Navigate to: Monitoring → Alerting
3. Create alerts for:
   - High error rate (>5%)
   - Unusual invocation count (>1000/min)
   - High memory usage (>80%)

### Cost Estimation

**Typical costs for Cloud Functions (Blaze plan):**
- First 2 million invocations/month: **FREE**
- Additional invocations: $0.40 per million
- Compute time: $0.0000025 per GB-second
- Network egress: $0.12 per GB

**Example usage:**
- 10,000 UPC lookups/month
- 500ms average execution time
- 256MB memory

**Estimated monthly cost:** ~$0.02 (basically free)

---

## Troubleshooting

### Error: "Cloud function not found"

**Cause:** Function not deployed or name mismatch

**Solution:**
```bash
firebase functions:list  # Check deployed functions
firebase deploy --only functions  # Redeploy
```

### Error: "Unauthenticated"

**Cause:** User not signed in

**Solution:** Ensure user is authenticated before calling function. The function requires `context.auth`.

### Error: "Email must be verified"

**Cause:** User hasn't verified their email

**Solution:** Check `AuthPage.tsx` - email verification is required.

### Error: "Network timeout"

**Cause:** API taking too long to respond

**Solution:** Function has 10-second timeout. Check logs:
```bash
firebase functions:log --only lookupUPC
```

### Error: "API key invalid"

**Cause:** Go-UPC or UPCItemDB key is incorrect

**Solution:** Update secrets:
```bash
firebase functions:secrets:set GO_UPC_API_KEY
# Paste new key

firebase deploy --only functions
```

### High latency

**Cause:** Cold starts (function hasn't been called recently)

**Solutions:**
1. Enable minimum instances (costs money but eliminates cold starts):
   ```typescript
   // In functions/src/index.ts
   export const lookupUPC = functions
     .runWith({ minInstances: 1 })  // Keep 1 instance warm
     .https.onCall(async (data, context) => {
       // ... existing code
     });
   ```

2. Implement result caching in Firestore

---

## Security Best Practices

### ✅ Do:
- Keep API keys in Cloud Functions environment
- Use Firebase Authentication (already implemented)
- Require email verification (already implemented)
- Monitor function logs for suspicious activity
- Rotate API keys every 90 days
- Use Firebase App Check for additional protection

### ❌ Don't:
- Put API keys in client code (defeats the purpose!)
- Allow unauthenticated function calls
- Deploy without testing in emulator first
- Ignore error logs and monitoring
- Share `.env` files or commit them to git

---

## Rollback Plan

If something goes wrong after deployment:

1. **Disable Cloud Functions temporarily:**
   ```env
   # In .env.local
   VITE_USE_CLOUD_FUNCTIONS=false
   ```

   Rebuild and redeploy hosting:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Revert to previous function version:**
   ```bash
   # List deployments
   firebase functions:log

   # Rollback functions (use deployment ID from logs)
   gcloud functions deploy lookupUPC --restore-deployment=DEPLOYMENT_ID
   ```

3. **Emergency: Delete function:**
   ```bash
   firebase functions:delete lookupUPC
   ```

---

## Advanced: Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// In functions/src/index.ts
import * as admin from "firebase-admin";

export const lookupUPC = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const uid = context.auth.uid;
  const rateLimitRef = admin.firestore()
    .collection("rateLimits")
    .doc(uid);

  // Check rate limit (max 100 requests per hour)
  const rateLimitDoc = await rateLimitRef.get();
  const rateLimitData = rateLimitDoc.data();

  if (rateLimitData) {
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Count recent requests
    const recentRequests = rateLimitData.requests?.filter(
      (timestamp: number) => timestamp > hourAgo
    ) || [];

    if (recentRequests.length >= 100) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. Try again later."
      );
    }

    // Add current request
    await rateLimitRef.update({
      requests: [...recentRequests, now],
    });
  } else {
    // First request
    await rateLimitRef.set({
      requests: [Date.now()],
    });
  }

  // ... existing UPC lookup code
});
```

---

## Need Help?

- Firebase Functions docs: https://firebase.google.com/docs/functions
- Cloud Functions pricing: https://firebase.google.com/pricing
- Stack Overflow: Tag `firebase` + `google-cloud-functions`
- Firebase Discord: https://discord.gg/firebase

---

**Setup completed!** Your API keys are now secure on the server. 🎉
