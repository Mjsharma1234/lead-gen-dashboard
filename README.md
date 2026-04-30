# ⚡ LeadFlow — Lead Generation & Competitive Intelligence Dashboard

A full-stack B2B lead generation and competitive analysis dashboard that queries **Apollo.io**, **Explee**, **Explorium**, and **Apify** simultaneously.

🌐 **Live Demo:** [lead-gen-dashboard-gray.vercel.app](https://lead-gen-dashboard-gray.vercel.app)

![LeadFlow Screenshot](https://lead-gen-dashboard-gray.vercel.app)

---

## Features

| Feature | Detail |
|---|---|
| **Multi-source Lead Search** | Apollo.io · Explee · Explorium · Apify queried simultaneously |
| **Smart Filters** | Lead Type · Industry · Country · Seniority · Keywords |
| **Contact Data** | Email, phone, website, LinkedIn per lead |
| **Deduplication** | Merges results across sources automatically |
| **Export to Excel** | `.xlsx` with Leads + Stats sheets (SheetJS) |
| **Competition Analysis** | Firmographics (Explorium) + website scraping (Apify) |
| **Saved Leads** | Persisted to localStorage across sessions |
| **Serverless API Proxy** | Vercel functions keep API keys secure |

---

## Tech Stack

- **Frontend:** Vite + Vanilla JS
- **Styling:** Custom dark design system (CSS variables, glassmorphism)
- **Backend:** Express.js proxy (local) / Vercel Serverless Functions (production)
- **APIs:** Apollo.io, Explee, Explorium, Apify
- **Export:** SheetJS (xlsx)

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/Mjsharma1234/lead-gen-dashboard.git
cd lead-gen-dashboard

# 2. Install dependencies
npm install

# 3. Copy env file and add your API keys (optional — can use Settings panel)
copy .env.example .env

# 4. Terminal 1: Start the proxy server
npm run server

# 5. Terminal 2: Start the frontend
npm run dev
```

Open **http://localhost:5173** — then go to ⚙ Settings and paste your API keys.

---

## API Keys Required

| Service | Get Key |
|---|---|
| Apollo.io | https://app.apollo.io/#/settings/integrations/api |
| Explee | https://app.explee.io/settings/api |
| Explorium | https://app.explorium.ai/ → Settings |
| Apify | https://console.apify.com/account/integrations |

---

## Deploying to Vercel

```bash
npx vercel --prod
```

Set environment variables in your Vercel dashboard:
`APOLLO_API_KEY`, `EXPLEE_API_KEY`, `EXPLORIUM_API_KEY`, `APIFY_API_KEY`

---

## Project Structure

```
├── api/                    # Vercel serverless functions (proxy)
│   ├── health.js
│   ├── apollo/
│   ├── explee/
│   ├── explorium/
│   └── apify/
├── src/
│   ├── modules/            # API clients + data logic
│   │   ├── apollo.js
│   │   ├── explee.js
│   │   ├── explorium.js
│   │   ├── apify.js
│   │   ├── leads.js        # Dedup, filter, sort, save
│   │   └── export.js       # Excel export
│   └── ui/                 # UI controllers
│       ├── leadSearch.js
│       ├── competition.js
│       ├── saved.js
│       └── settings.js
├── server.js               # Local Express proxy
├── index.html
└── vite.config.js
```

---

## License

MIT
