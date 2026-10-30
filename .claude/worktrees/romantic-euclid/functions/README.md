# Cloud Functions for Inventory WMS

This directory contains Firebase Cloud Functions that provide secure backend services for the Inventory WMS application.

## Functions

### `lookupUPC`
Securely looks up product information by UPC code.

**Type:** Callable HTTPS function (requires authentication)

**Parameters:**
```typescript
{
  upc: string  // UPC code to lookup (will be sanitized)
}
```

**Returns:**
```typescript
{
  upc: string
  title?: string
  brand?: string
  model?: string
  description?: string
  imageUrl?: string
  category?: string
}
```

**Errors:**
- `unauthenticated`: User not logged in
- `permission-denied`: Email not verified
- `invalid-argument`: Invalid UPC code
- `not-found`: No product found for UPC

**Security:**
- Requires Firebase Authentication
- Requires verified email
- API keys stored securely in environment
- Implements timeout protection (10s)
- Logs all requests for monitoring

### `healthCheck`
Simple health check endpoint for monitoring.

**Type:** HTTP function (public)

**Returns:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Development

### Install Dependencies
```bash
npm install
```

### Build TypeScript
```bash
npm run build
```

### Watch Mode (auto-rebuild on changes)
```bash
npm run build:watch
```

### Run Locally with Emulator
```bash
# From project root
firebase emulators:start

# Or from functions directory
npm run serve
```

### Deploy
```bash
# From project root
firebase deploy --only functions

# Or from functions directory
npm run deploy
```

## Environment Variables

Required for UPC lookup:
- `GO_UPC_API_KEY` - Go-UPC API key (preferred service)
- `UPCITEMDB_API_KEY` - UPCItemDB API key (optional, for full database access)

### Local Development
Create `functions/.env`:
```env
GO_UPC_API_KEY=your-key-here
UPCITEMDB_API_KEY=your-key-here
```

### Production
Set using Firebase CLI:
```bash
firebase functions:secrets:set GO_UPC_API_KEY
firebase functions:secrets:set UPCITEMDB_API_KEY
```

## API Fallback Strategy

The `lookupUPC` function tries multiple APIs in sequence:

1. **Go-UPC** (if `GO_UPC_API_KEY` is set)
   - Most comprehensive database
   - Best data quality
   - Requires paid API key

2. **UPCItemDB** (trial or authenticated)
   - Falls back to trial endpoint if no key
   - Trial has limited database coverage
   - Full API available with key

3. **OpenFoodFacts** (always free)
   - Food and grocery products only
   - No API key required
   - Good fallback for consumables

If all three fail, returns `not-found` error.

## Monitoring

### View Logs
```bash
# Real-time logs
firebase functions:log

# Filter by function
firebase functions:log --only lookupUPC

# Logs with structured data
firebase functions:log --only lookupUPC --format json
```

### Firebase Console
View metrics, errors, and logs: https://console.firebase.google.com/project/YOUR_PROJECT/functions

## Cost Optimization

**Tips to minimize costs:**
1. Implement caching in Firestore (cache UPC results for 30 days)
2. Use minimum instances only if cold starts are a problem
3. Monitor invocation count and set up billing alerts
4. Consider result deduplication (check cache before calling function)

**Current configuration:**
- Memory: 256 MB (default)
- Timeout: 60s (default)
- Min instances: 0 (scales to zero)
- Max instances: 1000 (default)

## Testing

### Unit Tests (TODO)
```bash
npm test
```

### Integration Tests
Use Firebase Emulator with test data:
```bash
firebase emulators:start --import=./test-data
```

## Troubleshooting

### "Cannot find module 'firebase-functions'"
```bash
cd functions
npm install
```

### "TypeScript compilation errors"
```bash
cd functions
npm run build
```

### "Function not found after deploy"
- Wait 1-2 minutes for deployment to propagate
- Check: `firebase functions:list`
- Verify region matches (default: us-central1)

### "API key invalid"
- Update secrets: `firebase functions:secrets:set GO_UPC_API_KEY`
- Redeploy: `firebase deploy --only functions`

## Security

**Implemented:**
- ✅ Authentication required
- ✅ Email verification required
- ✅ Input sanitization
- ✅ UPC format validation
- ✅ Timeout protection
- ✅ Error logging
- ✅ Secure environment variables

**TODO:**
- [ ] Rate limiting per user
- [ ] IP-based rate limiting
- [ ] Request caching
- [ ] Firebase App Check integration
- [ ] Billing alerts
- [ ] Error rate alerts

## Contributing

1. Make changes in `src/index.ts`
2. Build: `npm run build`
3. Test locally: `firebase emulators:start`
4. Deploy: `firebase deploy --only functions`

## License

Same as main project.
