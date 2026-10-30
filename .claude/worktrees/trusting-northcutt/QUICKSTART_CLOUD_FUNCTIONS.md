# Quick Start: Cloud Functions for Secure UPC Lookup

## ✅ What's Been Set Up

I've configured your app to use secure Cloud Functions for UPC lookups. Here's what was created:

### Files Created:
- **`functions/`** - Cloud Functions directory
  - `src/index.ts` - UPC lookup function with 3-tier fallback
  - `package.json` - Dependencies
  - `tsconfig.json` - TypeScript config
  - `.env.example` - Environment variable template
  - `README.md` - Detailed documentation

- **Documentation:**
  - `CLOUD_FUNCTIONS_SETUP.md` - Complete setup guide
  - `QUICKSTART_CLOUD_FUNCTIONS.md` - This file

### Files Modified:
- **`src/utils/helpers.ts`** - Added Cloud Functions support
- **`src/App.tsx`** - Passes Firebase app to lookup function
- **`firebase.json`** - Added functions configuration + security headers
- **`.env.example`** - Added `VITE_USE_CLOUD_FUNCTIONS` flag

---

## 🚀 Quick Start (5 minutes)

### Step 1: Install Function Dependencies
```bash
cd functions
npm install
cd ..
```

### Step 2: Configure Environment (Local Testing)
```bash
# Copy example files
cp .env.example .env.local
cp functions/.env.example functions/.env

# Edit .env.local
# Set: VITE_USE_CLOUD_FUNCTIONS=true

# Edit functions/.env
# Add your API keys:
# GO_UPC_API_KEY=your-key-here
# UPCITEMDB_API_KEY=your-key-here (optional)
```

### Step 3: Test Locally
```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Start dev server
npm run dev
```

Visit http://localhost:5173 and try a UPC lookup!

### Step 4: Deploy to Production
```bash
# Set production secrets
firebase functions:secrets:set GO_UPC_API_KEY
# Paste your key when prompted

# Build and deploy
npm run build
firebase deploy
```

Done! Your API keys are now secure. 🎉

---

## 📋 Before vs After

### Before (Insecure):
```
❌ API keys visible in browser DevTools
❌ API keys in built JavaScript files
❌ Anyone can extract and abuse your API quota
❌ No rate limiting
❌ No centralized logging
```

### After (Secure):
```
✅ API keys stored securely on server
✅ Authentication required for lookups
✅ Email verification enforced
✅ Timeout protection (10s max)
✅ Comprehensive logging
✅ Easy to add rate limiting
```

---

## 🧪 Testing Checklist

Test these scenarios to ensure everything works:

- [ ] **Local Emulator Test**
  1. Run `firebase emulators:start`
  2. Run `npm run dev`
  3. Sign in to app
  4. Try UPC lookup: `885909950805`
  5. Check emulator logs for "Go-UPC lookup successful"

- [ ] **Production Test**
  1. Deploy: `firebase deploy`
  2. Visit: https://YOUR_PROJECT.web.app
  3. Sign in
  4. Try UPC lookup
  5. Check logs: `firebase functions:log`

- [ ] **Error Handling**
  1. Try invalid UPC: `abc123` (should fail gracefully)
  2. Try non-existent UPC: `000000000000`
  3. Sign out and try lookup (should require authentication)

---

## 🔧 Configuration Options

### Client-Side (.env.local)

```env
# Enable/disable Cloud Functions
VITE_USE_CLOUD_FUNCTIONS=true   # Production (secure)
# VITE_USE_CLOUD_FUNCTIONS=false  # Development (exposes keys)

# These are ignored when Cloud Functions are enabled:
# VITE_GOUPC_API_KEY=...
# VITE_UPCITEMDB_KEY=...

# Other settings
VITE_ALLOWED_EMAIL_DOMAIN=bluelinxco.com
```

### Server-Side (functions/.env)

```env
# API keys (kept secure on server)
GO_UPC_API_KEY=your-actual-key-here
UPCITEMDB_API_KEY=your-actual-key-here
```

---

## 📊 Monitoring

### View Function Logs
```bash
# Real-time logs
firebase functions:log

# Filter by function
firebase functions:log --only lookupUPC
```

### Check Function Status
```bash
# List deployed functions
firebase functions:list

# Expected output:
# ✓ lookupUPC(us-central1)
# ✓ healthCheck(us-central1)
```

### Firebase Console
https://console.firebase.google.com/project/YOUR_PROJECT/functions

Monitor:
- Invocations per minute
- Error rate
- Execution time
- Memory usage
- Cost

---

## 💰 Cost Estimate

**Firebase Cloud Functions (Blaze Plan):**
- First 2M invocations/month: **FREE**
- After that: $0.40 per million invocations
- Compute: $0.0000025 per GB-second

**Typical usage (10,000 lookups/month):**
- **Cost: ~$0.02/month** (practically free!)

Set up billing alerts at $5/month to be safe.

---

## ❓ Common Issues

### "Function not found"
**Solution:** Deploy functions first
```bash
firebase deploy --only functions
```

### "Unauthenticated"
**Solution:** Sign in to the app first. Functions require authentication.

### "Email must be verified"
**Solution:** Check your email for verification link. Functions require verified emails.

### "No product found"
**Solution:** UPCItemDB trial has limited data. Either:
1. Use a UPC that works with trial (e.g., `885909950805`)
2. Add a real API key to `functions/.env`

### Emulator not starting
**Solution:** Check port conflicts
```bash
# Kill processes on ports 5001, 8080, 9099
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
lsof -ti:9099 | xargs kill -9

# Restart emulator
firebase emulators:start
```

---

## 🔄 Switching Between Modes

### Use Cloud Functions (Production - Secure)
```env
# .env.local
VITE_USE_CLOUD_FUNCTIONS=true
```
Rebuild and deploy:
```bash
npm run build
firebase deploy
```

### Use Direct API Calls (Development - Insecure)
```env
# .env.local
VITE_USE_CLOUD_FUNCTIONS=false
VITE_GOUPC_API_KEY=your-key-here
```
Rebuild:
```bash
npm run dev
```

---

## 📚 Next Steps

1. **Review full guide:** [CLOUD_FUNCTIONS_SETUP.md](CLOUD_FUNCTIONS_SETUP.md)
2. **Add rate limiting** (see setup guide)
3. **Implement caching** to reduce API calls
4. **Set up billing alerts** in Firebase console
5. **Enable Firebase App Check** for additional security
6. **Create Firestore security rules** (see [SECURITY.md](SECURITY.md))

---

## 🆘 Need Help?

Check these resources:
- **Full Setup Guide:** [CLOUD_FUNCTIONS_SETUP.md](CLOUD_FUNCTIONS_SETUP.md)
- **Functions README:** [functions/README.md](functions/README.md)
- **Security Guide:** [SECURITY.md](SECURITY.md)
- **Firebase Docs:** https://firebase.google.com/docs/functions

---

**Your API keys are now secure!** 🔒

The Cloud Functions setup protects your API keys by keeping them server-side while maintaining the same user experience.
