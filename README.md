# *Cuprum*: E-Waste Collection Portal

Book a free doorstep pickup for old electronics. Residents create an account, request a pickup
(with their current location), and track or cancel it from their profile.

Web Technology (23CS2048) IA3 skill-based project, John Chrispin Durai A (URK24CS1060).

The landing page also has an AI scanner: hold a gadget up to the camera and an on-device image
model (MobileCLIP-S2 on GPU, MobileCLIP-S0 on the CPU fallback) identifies it, estimates the
metals inside, and a bioleaching simulator shows microbes recovering the copper. Every output
there is an educational estimate.

## Collection portal

A full-stack pickup portal: plain HTML/CSS/JS pages in `public/`, a Node.js API in `api/` (Vercel
serverless functions), and MongoDB Atlas for storage.

| Page | What |
| --- | --- |
| `/login.html` | Sign up / log in. Passwords are hashed with bcrypt; the server returns a JWT kept in `localStorage`. |
| `/pickup.html` | Book a doorstep pickup: items, address (or "Use my current location" via the Geolocation API + OpenStreetMap), date, time slot. |
| `/profile.html` | Edit your details, see your pickup stats and history, cancel upcoming pickups. |

| API route | Method | What |
| --- | --- | --- |
| `/api/signup` | POST | Create an account |
| `/api/login` | POST | Log in, get a token |
| `/api/profile` | GET / PUT | Read / update the logged-in user |
| `/api/pickups` | GET / POST / PATCH | List, create, cancel your pickups |
| `/api/admin` | GET / PATCH | Admins only: every pickup with its customer, totals; mark collected / cancel / reopen |

`/admin.html` is the collection team's page. Admins are users with `role: "admin"`; make one with
`node --env-file=.env scripts/make-admin.mjs <email> <password> "Full Name"` (sign-up never creates admins).

Every input is validated twice: in the browser (`public/auth.js`) for instant feedback, and on the
server (`api/_lib.js`) because the browser can be bypassed. MongoDB collections: `users`, `pickups`.

Environment variables (Vercel → Settings → Environment Variables): `MONGODB_URI`, `JWT_SECRET`.

### Run the whole site locally (Node 22+)

```
npm install
# create .env with:  MONGODB_URI="mongodb+srv://..."   JWT_SECRET="any long random string"
npm run build      # once, builds the home page
npm run portal     # http://localhost:3000  (backend on /api, same MongoDB Atlas database)
```

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # https on your network, so a phone can use its camera
npm run build      # static site in dist/ (deploy anywhere, e.g. Vercel)
npm run check      # model self-checks (the proposal's 90 g example, literature anchoring)
```

The camera needs `https` or `localhost`. Uploads and the sample photos work anywhere.

## Before a live demo

- Open the site once on the demo machine. The model (≈ 72 MB with a GPU, 45 MB without) downloads on first visit and is cached after that.
- No WebGPU (older browser)? It falls back to the smaller CPU model automatically (~200 ms per frame, a few points less accurate).
- Hold items 20–40 cm from the camera, filling most of the frame. A plain background helps.

## Where things live

| Path | What |
| --- | --- |
| `src/ai/labels.json` | The 32 categories and the sentences that describe them |
| `scripts/embed.mjs` | Encodes those sentences, scores models on clean, webcam-degraded and held-up test sets, writes `src/ai/embeds.json` (`--write --slot=gpu` or `--slot=cpu`) |
| `src/data/science.ts` | Every number shown on the page, each with its source |
| `src/sim/model.ts` | The bioleaching model (`model.check.ts` tests it) |
| `src/three/` | The 3D board, powder and reactor |

Debug switches: `?cpu` forces the CPU path, `?noai` skips the model, `?no3d` skips the 3D scene.
