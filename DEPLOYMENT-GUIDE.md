# Cats On Crack — Phase 3 Deployment Guide

Same process as The Fuglys. Here's the quick version:

## Deploy Steps

### 1. Unzip and install
```
cd C:\Users\chris\Downloads\catsoncrack-phase3\coc-build
npm install
```

### 2. Set up environment
```
copy .env.example .env
notepad .env
```

Add your Sanity API token for project `8ksun996`:
- Go to https://www.sanity.io/manage/project/8ksun996 → API → Tokens → Add token (Editor)

### 3. Deploy Sanity schemas
```
cd sanity
npm install sanity @sanity/cli
npx sanity deploy
```
Confirm studio hostname as `catsoncrack`.

### 4. Run content migration
```
cd ..
npm run migrate
```
Verify at https://catsoncrack.sanity.studio

### 5. Push to GitHub
```
git init
git add .
git commit -m "Phase 3: Full backend - Sanity CMS, Stripe, Printful, AEO/GEO"
git remote add origin https://github.com/TheMetavision/catsoncrack.git
git branch -M main
git push -u origin main
```

### 6. Connect to Netlify
- Import from GitHub → select `catsoncrack` repo
- Build command: `npm run build`
- Publish directory: `dist`
- Import .env variables
- Deploy

### 7. Stripe & Printful webhooks (when ready)
- Stripe endpoint: `https://YOUR_SITE/.netlify/functions/stripe-webhook`
- Printful endpoint: `https://YOUR_SITE/.netlify/functions/printful-webhook`

## Key Differences from The Fuglys

| | The Fuglys | Cats On Crack |
|---|---|---|
| Sanity Project | ngx60q2x | 8ksun996 |
| Characters | 32 (wasteland misfits) | 6 (alley cats) |
| Blog name | Wasteland Whispers | The Alleyway Gazette |
| Characters page | Meet The Misfits | The Alley Squad |
| Design | Teal/crimson | Charcoal/neon magenta |
| Character data | Standard | + accent colours, initials, glow values |

## File Reference

Same structure as The Fuglys — see that deployment guide for full file reference.
COC-specific files:
- `src/lib/sanity.ts` — Points to project `8ksun996`
- `src/lib/schema.ts` — COC branding in JSON-LD
- `src/components/CartDrawer.tsx` — Neon magenta styling with glow effects
- `scripts/migrate-content.mjs` — 6 characters with accent colours
- `public/llms.txt` — COC-specific AI discoverability
