# Auton

An AI CRM built for multi-tenancy and n8n integration for automations. Originally built in early 2025 as an internal tool at our company for managing AI-powered customer engagement across SMS, voice, and email.

We used this with a handful of clients for a while, then moved on to a newer product. I went through it, stripped out the billing/payment stuff and some client-specific things, and figured I'd leave it here for anyone who wants to pick it up, repurpose it, or build something on top of it.

**Fair warning** — this is not my greatest work. It was built fast for internal use and it shows in places. There are no tests, the logging is just console.log, and there's a bunch of TODOs scattered around. It'll need real cleanup before you'd want to run it in production or turn it into a proper product. But the bones are solid — the multi-tenant architecture works, the AI agent system works, the workflow builder works, and the Twilio/ElevenLabs integrations are functional. It has potential if someone wants to put the time in.

## What it does

- **AI agents** that handle SMS, phone calls, and email — powered by OpenAI, Anthropic Claude, or Google Gemini
- **Inbound and outbound SMS handling** via Twilio with automatic AI agent responses
- **Call handling with ElevenLabs** — AI voice agents that can take and make phone calls
- **AI conversation summarization** — agents remember past interactions and build contact profiles over time
- **Visual workflow builder** — drag-and-drop automation builder (React Flow) with n8n integration for complex multi-step workflows
- **Contact management** — full CRM with custom fields, tags, conversation history, and sales pipeline tracking
- **Email** — Mailgun integration with custom domain support, email templates, and AI-powered content generation
- **Multi-tenant** — built from the ground up for multi-tenancy with subaccount support, role-based access, and tenant switching
- **Knowledge base** — RAG system for grounding agent responses in your own documents
- **Calendar system** — event management with milestone tracking and workflow triggers
- **2FA** — TOTP and SMS OTP support
- **API keys** — programmatic access alongside Firebase JWT auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Express.js, TypeScript, Node.js 18+ |
| Database | Firebase Firestore (NoSQL) |
| Auth | Firebase Auth + JWT + API Keys |
| AI | OpenAI, Anthropic Claude, Google Gemini, ElevenLabs |
| SMS/Voice | Twilio |
| Email | Mailgun |
| Workflows | n8n, React Flow |
| Storage | Firebase Cloud Storage |

## Getting Started

### Prerequisites

- Node.js >= 18
- A Firebase project (Firestore + Auth enabled)
- Twilio account (for SMS/voice)
- At least one AI provider key (OpenAI, Anthropic, or Google)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/auton.git
cd auton
```

### 2. Backend

```bash
cd api
cp .env.example .env
# Fill in your credentials
npm install
npm run dev
```

Runs on `http://localhost:8000`.

### 3. Frontend

```bash
cd web
cp .env.example .env.local
# Fill in your Firebase config
npm install
npm run dev
```

Runs on `http://localhost:3000`.

### 4. Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password + Google)
3. Enable Cloud Firestore
4. Generate a service account key for the backend `.env`
5. Copy the web config to the frontend `.env.local`

See `api/FIRESTORE_MANUAL_SETUP.md` for Firestore index setup.

## Services

| Service | Required? | What for |
|---------|-----------|----------|
| Firebase | Yes | Database, auth, storage |
| OpenAI / Anthropic / Gemini | Yes (pick one) | AI agent brains |
| Twilio | For SMS/voice | SMS and phone calls |
| ElevenLabs | For voice agents | AI voice synthesis |
| Mailgun | For email | Email with custom domains |
| n8n | Optional | Advanced workflow automation |
| Google OAuth | Optional | Calendar integration |

## Project Structure

```
auton/
├── api/                        # Express.js API
│   ├── src/
│   │   ├── agents/             # Agent management
│   │   ├── agentCommunication/ # SMS, phone, chat channels
│   │   ├── contacts/           # Contact CRUD
│   │   ├── crm/               # Conversations
│   │   ├── workflows/          # Workflow builder + node registry
│   │   ├── n8n/               # n8n transformation system
│   │   ├── inboundEvents/     # Twilio/Mailgun/webhook handlers
│   │   ├── KnowledgeBaseDocuments/ # RAG knowledge base
│   │   ├── middleware/         # Auth, rate limiting, logging
│   │   └── ...
│   └── .env.example
│
├── web/                        # Next.js app
│   ├── app/                    # Pages (App Router)
│   ├── components/             # UI components
│   ├── contexts/               # Auth context
│   ├── hooks/                  # React hooks
│   ├── lib/                    # API clients, Firebase config
│   └── .env.example
│
├── LICENSE
└── README.md
```

## What you'd want to fix before production

Just being honest about the state of things:

- **No tests** — zero. You'll want to add them.
- **No CI/CD** — no GitHub Actions, no automated deployments
- **Console.log everywhere** — no structured logging
- **No monitoring** — no error tracking, no metrics
- **Input validation is minimal** — only on auth routes
- **No Docker** — you'll want to containerize it
- **Lots of TODOs** — some features are half-finished

The architecture and core features work though. It ran in production for real clients.

## License

MIT — do whatever you want with it. See [LICENSE](LICENSE).
