# EmirateFulfil

## Run locally
```
npm install
npm run dev
```

## Deploy live (free, ~3 minutes)
1. Push this whole folder to your GitHub repo (replace whatever was there before — you need ALL these files, not just the one .jsx file).
2. Go to https://vercel.com → Sign up / log in with GitHub.
3. Click "Add New Project" → select this repo → Vercel auto-detects Vite → click "Deploy".
4. In ~1 minute you'll get a live URL like `emiratefulfil.vercel.app`.

## Note on data storage
Sign-up/login/orders are stored in the visitor's own browser (localStorage) via `src/storageShim.js`. Each visitor's data stays on their device — it is not shared across users yet. For a real shared backend (so every seller sees the same live data from any device), swap the shim for a real database like Supabase or Firebase.
