# Security Guide for Inventory WMS App

## Critical Security Issues

### 1. API Keys Exposed in Client-Side Code ⚠️

**Current Status:** API keys are embedded in the JavaScript bundle and visible to anyone.

**Current Implementation:**
- API keys stored in `.env.local` (✅ not committed to git)
- Vite bundles these into client JavaScript (❌ publicly visible)
- Anyone can extract keys from Network tab or built files

**Immediate Mitigation:**
1. **Rotate your API keys** if you've deployed to production or shared the build
2. Use the trial endpoints when possible (no API key required)
3. Monitor your API usage for abuse

**Proper Solution (Recommended for Production):**

#### Option A: Cloud Functions Proxy (Best for Production)

Create Firebase Cloud Functions to proxy API calls:

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

// Store API key in Cloud Function environment
export const lookupUPC = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { upc } = data;
  const apiKey = functions.config().goupc.key; // Secure storage

  const response = await fetch(
    `https://go-upc.com/api/v1/code/${encodeURIComponent(upc)}?key=${apiKey}`
  );

  return await response.json();
});
```

Then call from client:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const lookupUPC = httpsCallable(functions, 'lookupUPC');
const result = await lookupUPC({ upc: '12345' });
```

**Benefits:**
- API keys never leave the server
- Can implement rate limiting
- Can add authentication checks
- Can cache results
- Can monitor and log usage

#### Option B: Firebase App Check

If you must keep API calls client-side, use Firebase App Check:

```typescript
// Add to your Firebase config
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true
});
```

Then validate App Check tokens in your backend or use Firestore Security Rules.

---

### 2. Missing Firestore Security Rules 🚨 CRITICAL

**Current Status:** NO security rules file found. Database may be wide open!

**Risk:** Any authenticated (or even unauthenticated) user can read/write ALL data.

**Immediate Action Required:**

Create `firestore.rules` in project root:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check email verification
    function isVerified() {
      return request.auth != null
             && request.auth.token.email_verified == true;
    }

    // Helper function to check allowed domain
    function isAllowedDomain() {
      return request.auth.token.email.matches('.*@bluelinxco.com$');
    }

    // All data under artifacts/{appId}/shared/global/
    match /artifacts/{appId}/shared/global/{collection}/{document=**} {
      // Require authentication, email verification, and company domain
      allow read: if isVerified() && isAllowedDomain();
      allow write: if isVerified() && isAllowedDomain();

      // TODO: Add role-based access control
      // TODO: Add field-level validation
      // TODO: Implement per-warehouse access control
    }
  }
}
```

Update `firebase.json`:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

**Test your rules:**
```bash
firebase emulators:start --only firestore
```

---

### 3. Recommended Security Enhancements

#### A. Implement Role-Based Access Control (RBAC)

Add user roles to Firestore:
```typescript
// Collection: users/{uid}
{
  email: "user@bluelinxco.com",
  role: "admin" | "manager" | "viewer",
  warehouses: ["warehouse-id-1", "warehouse-id-2"] // Access control
}
```

Update security rules:
```javascript
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

function hasWarehouseAccess(warehouseId) {
  let userWarehouses = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.warehouses;
  return warehouseId in userWarehouses;
}

allow read: if isVerified() && getUserRole() in ['admin', 'manager', 'viewer'];
allow write: if isVerified() && getUserRole() in ['admin', 'manager'];
allow delete: if isVerified() && getUserRole() == 'admin';
```

#### B. Input Validation

Add validation in Firestore rules:
```javascript
match /artifacts/{appId}/shared/global/inventory/{itemId} {
  allow write: if isVerified()
                  && request.resource.data.keys().hasAll(['upc', 'name', 'modelNumber'])
                  && request.resource.data.amountInInventory >= 0
                  && request.resource.data.minStockLevel >= 0;
}
```

#### C. File Upload Security

For image uploads:
1. Use Firebase Storage instead of base64 in Firestore
2. Add file size limits (5MB max)
3. Validate file types server-side
4. Scan for malware using Cloud Functions

Example Cloud Function:
```typescript
export const processImageUpload = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  // Validate file type
  if (!contentType.startsWith('image/')) {
    await admin.storage().bucket().file(filePath).delete();
    throw new Error('Invalid file type');
  }

  // Check file size
  const size = parseInt(object.size);
  if (size > 5 * 1024 * 1024) { // 5MB
    await admin.storage().bucket().file(filePath).delete();
    throw new Error('File too large');
  }

  // Additional processing: resize, optimize, scan
});
```

#### D. CSV Import Security

Improve CSV parsing to prevent injection:
```typescript
export function parseCsvSafe(text: string): string[][] {
  // Use a proper CSV library like PapaParse
  import Papa from 'papaparse';

  const result = Papa.parse(text, {
    skipEmptyLines: true,
    transform: (value) => {
      // Strip Excel formulas (CSV injection protection)
      if (value.startsWith('=') || value.startsWith('+') ||
          value.startsWith('-') || value.startsWith('@')) {
        return "'" + value; // Escape formulas
      }
      return value;
    }
  });

  return result.data;
}
```

Add file size limits:
```typescript
const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_CSV_SIZE) {
  messageBoxRef.current?.alert('CSV file too large (max 10MB)');
  return;
}
```

#### E. Session Security

Add idle timeout:
```typescript
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let lastActivity = Date.now();

useEffect(() => {
  const handleActivity = () => {
    lastActivity = Date.now();
  };

  window.addEventListener('mousemove', handleActivity);
  window.addEventListener('keypress', handleActivity);

  const checkIdle = setInterval(() => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT) {
      signOut(auth);
      messageBoxRef.current?.alert('Session expired due to inactivity');
    }
  }, 60000); // Check every minute

  return () => {
    window.removeEventListener('mousemove', handleActivity);
    window.removeEventListener('keypress', handleActivity);
    clearInterval(checkIdle);
  };
}, [auth]);
```

---

## Environment Variables

**Required Variables:**
- `VITE_ALLOWED_EMAIL_DOMAIN` - Restrict signups to company domain
- `VITE_GOUPC_API_KEY` - Go-UPC API key (⚠️ visible in bundle)
- `VITE_UPCITEMDB_KEY` - UPCItemDB API key (optional, ⚠️ visible in bundle)

**Setup:**
1. Copy `.env.example` to `.env.local`
2. Fill in your actual values
3. Never commit `.env.local` to git (already in `.gitignore`)

---

## Deployment Security Checklist

Before deploying to production:

- [ ] Firestore security rules deployed and tested
- [ ] API keys rotated if previously exposed
- [ ] API calls moved to Cloud Functions (recommended)
- [ ] Firebase App Check enabled
- [ ] Email domain restriction configured
- [ ] File upload limits implemented
- [ ] CSV injection protection added
- [ ] Session timeout implemented
- [ ] Multi-factor authentication enabled (optional but recommended)
- [ ] Security headers configured in `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
          }
        ]
      }
    ]
  }
}
```

---

## Monitoring and Incident Response

1. **Enable Firebase Analytics** to track usage patterns
2. **Set up alerts** for:
   - Failed authentication attempts
   - Large batch operations
   - Unusual data access patterns
3. **Regular security audits** (quarterly)
4. **Dependency updates** (monthly)
5. **API key rotation** (every 90 days)

---

## Getting Help

- Firebase Security Rules: https://firebase.google.com/docs/rules
- Cloud Functions: https://firebase.google.com/docs/functions
- App Check: https://firebase.google.com/docs/app-check
- Report security issues: [your-security-email@bluelinxco.com]

---

**Last Updated:** 2026-02-03
**Next Review:** 2026-05-03
