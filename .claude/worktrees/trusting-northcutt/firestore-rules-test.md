# 🧪 Firestore Security Rules Testing Guide

## Current Project: inventory-wms

---

## 🎯 Test Plan Overview

We'll test:
1. ✅ Unauthenticated access (should be blocked)
2. ✅ Authenticated but unverified email (should be blocked)
3. ✅ Authenticated with verified email (should be allowed)
4. ✅ User-specific data access controls

---

## 🚀 Quick Test Commands

### 1. Start Firebase Emulator
```bash
firebase emulators:start --only firestore
```

**Expected Output:**
```
✔  firestore: Emulator started at http://127.0.0.1:8080
┌─────────────┬────────────────┬─────────────────────────────────┐
│ Emulator    │ Host:Port      │ View in Emulator UI             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ Firestore   │ 127.0.0.1:8080 │ http://127.0.0.1:4000/firestore │
└─────────────┴────────────────┴─────────────────────────────────┘
```

### 2. Test Your App with Emulator

In another terminal:
```bash
# Start your dev server
npm run dev
```

Then test in your app:
- Try to access data while logged out (should fail)
- Log in and try to access data (should work if email verified)

---

## 🔍 Manual Security Rules Testing

### Test 1: Deny Unauthenticated Access ❌

**What we're testing:** Unauthenticated users cannot read/write data

**Test in Emulator UI:**
1. Open http://127.0.0.1:4000/firestore
2. Go to "Rules" tab
3. Click "Rules Playground"
4. Configure test:
   ```
   Location: /artifacts/wms-app-prod/shared/global/inventory/test-item
   Operation: get
   Authenticated: NO
   ```
5. Click "Run"
6. **Expected:** ❌ Access Denied (Simulate failed)

---

### Test 2: Deny Unverified Email ❌

**What we're testing:** Users with unverified emails cannot access data

**Test Configuration:**
```
Location: /artifacts/wms-app-prod/shared/global/inventory/test-item
Operation: get
Authenticated: YES
Provider: Google
Signed in: YES
Email Verified: NO  ← Important!
```

**Expected:** ❌ Access Denied

---

### Test 3: Allow Verified Users ✅

**What we're testing:** Authenticated users with verified emails CAN access data

**Test Configuration:**
```
Location: /artifacts/wms-app-prod/shared/global/inventory/test-item
Operation: get
Authenticated: YES
Provider: Google
Signed in: YES
Email Verified: YES  ← Important!
```

**Expected:** ✅ Access Allowed

---

### Test 4: Write Operations ✅

**Test Configuration:**
```
Location: /artifacts/wms-app-prod/shared/global/inventory/test-item
Operation: set (or update, or delete)
Authenticated: YES
Email Verified: YES
```

**Expected:** ✅ Access Allowed

---

## 🧪 Automated Testing (Optional)

Create `firestore.test.js` for automated testing:

```javascript
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');

const PROJECT_ID = 'inventory-wms';
const RULES = readFileSync('firestore.rules', 'utf8');

describe('Firestore Security Rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: RULES }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('Deny unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const doc = db.doc('artifacts/wms-app-prod/shared/global/inventory/test');

    await expect(doc.get()).toDeny();
  });

  test('Deny unverified email', async () => {
    const db = testEnv.authenticatedContext('user1', {
      email_verified: false
    }).firestore();
    const doc = db.doc('artifacts/wms-app-prod/shared/global/inventory/test');

    await expect(doc.get()).toDeny();
  });

  test('Allow verified user read', async () => {
    const db = testEnv.authenticatedContext('user1', {
      email_verified: true,
      email: 'test@example.com'
    }).firestore();
    const doc = db.doc('artifacts/wms-app-prod/shared/global/inventory/test');

    await expect(doc.get()).toAllow();
  });
});
```

---

## 🌐 Domain Restrictions Configuration

### Step 1: Open Firebase Console
```
https://console.firebase.google.com/project/inventory-wms/settings/general/
```

### Step 2: Configure API Key Restrictions

1. Scroll to "Your apps" section
2. Find your web app
3. Click "Settings" (gear icon)
4. Under "API key" → Click on the key value to go to Google Cloud Console

**OR** go directly to:
```
https://console.cloud.google.com/apis/credentials?project=inventory-wms
```

### Step 3: Add Restrictions

Click on your API key (starts with `AIzaSy...`), then:

**Application restrictions:**
- Select: "HTTP referrers (web sites)"
- Add referrers:
  ```
  https://inventory-wms.web.app/*
  https://inventory-wms.firebaseapp.com/*
  https://*.inventory-wms.web.app/*
  http://localhost:*
  http://127.0.0.1:*
  http://localhost:5173/*
  ```

**API restrictions:**
- Select: "Restrict key"
- Enable these APIs:
  - ✅ Cloud Firestore API
  - ✅ Firebase Authentication
  - ✅ Cloud Functions
  - ✅ Identity Toolkit API
  - ✅ Token Service API

Click **Save**

---

## 🔒 Security Checklist

### Firestore Rules
- [x] Created firestore.rules file
- [x] Added to firebase.json
- [ ] Tested with emulator
- [ ] Verified unauthenticated access blocked
- [ ] Verified verified users can access
- [ ] Deployed to production

### API Key Restrictions
- [ ] Domain restrictions configured
- [ ] API restrictions configured
- [ ] Localhost added for development
- [ ] Production domains added

### Cloud Functions Security
- [ ] API keys stored in environment
- [ ] Authentication required
- [ ] Email verification enforced
- [ ] Rate limiting considered

---

## 🚀 Deploy Security Rules

Once testing passes:

```bash
# Deploy just the rules
firebase deploy --only firestore:rules

# Or deploy everything
firebase deploy
```

---

## ✅ Verification After Deployment

1. **Check Rules Deployed:**
   ```bash
   firebase firestore:rules:get
   ```

2. **Test in Production:**
   - Try accessing data while logged out → Should fail
   - Log in with unverified email → Should fail
   - Verify email and try again → Should work

3. **Check Logs:**
   ```bash
   firebase firestore:rules:logs
   ```

---

## 🆘 Troubleshooting

### "Permission Denied" Error

**Symptom:** Users getting permission denied when logged in

**Check:**
1. Is email verified? `user.emailVerified === true`
2. Is the path correct? Must match: `artifacts/{appId}/shared/global/{collection}/...`
3. Check Firebase Console → Firestore → Rules tab

### Rules Not Updating

**Solution:**
```bash
# Force redeploy
firebase deploy --only firestore:rules --force
```

### Emulator Not Working

**Solution:**
```bash
# Clear emulator data
rm -rf ~/.firebase/emulators/firestore

# Restart
firebase emulators:start --only firestore
```

---

## 📚 Additional Resources

- [Firebase Security Rules Docs](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Playground](https://console.firebase.google.com/project/inventory-wms/firestore/rules)
- [Testing Rules](https://firebase.google.com/docs/rules/unit-tests)

---

**Last Updated:** 2026-02-06
