# PropTrack — Claude Code Guide

## What is PropTrack?
A mobile app for small landlords (1–5 units) to track maintenance requests, manage tenants, log expenses, and communicate — without using text messages.

**Tagline:** "Built for the landlord next door, not a property empire."
**Live app:** https://p_0k7pvyjvvqp2oz5830ksw.rork.live
**Landing page:** https://proptrack.app
**Bundle ID:** com.proptrack.app

---

## Stack
| Layer | Tool |
|---|---|
| Mobile app | Expo Router + React Native (TypeScript), built in Rork |
| Database | Supabase (PostgreSQL) — project: tfshawyalkvxmryjqbzh |
| Auth | Supabase Auth (email/password + magic link) |
| Landing page | Static HTML/JS on Vercel (proptrack-landing) |
| Email | AWS SES via nodemailer (support@proptrack.app) |
| Domain | proptrack.app on Cloudflare |
| Build/Submit | EAS (Expo Application Services) |

---

## Division of Responsibility

| What | Who touches it |
|---|---|
| App screens, UI, components, context | **Rork** — do NOT edit these files in Claude Code |
| `supabase/schema.sql` | Rork generates, Claude.ai applies via MCP |
| `.agents/` config, `CLAUDE.md`, marketing files | **Claude Code** ✅ |
| Landing page (`proptrack-landing/`) | Claude.ai deploys via Vercel CLI |
| Supabase migrations | Claude.ai applies via Supabase MCP |

> ⚠️ Do NOT edit app source files (app/, context/, components/, types/) in Claude Code. Rork owns these and will overwrite changes on next push.

---

## Pricing Tiers
| Plan | Price | Units |
|---|---|---|
| Starter | Free | 1 |
| Essential | $9/mo | 3 |
| Pro | $19/mo | 10 |

---

## Brand
- **Primary:** Teal `#0C8276`
- **Accent:** Gold `#D4883A`
- **Background:** Warm White `#F8F6F3`
- **Text:** Charcoal `#1C1917`
- **Fonts:** DM Sans (body), DM Serif Display (headers)
- **Icons:** Lucide, stroke 1.8

---

## Marketing Skills
Marketing skills are in `.agents/skills/`. Key skills for PropTrack:

- `page-cro` — Optimize proptrack.app for more signups
- `copywriting` — Landing page copy, value props
- `seo-audit` — Rank for "landlord maintenance app", "rental tracker"
- `email-sequence` — Waitlist nurture + onboarding sequences
- `paid-ads` — Google/Meta campaigns targeting small landlords
- `ad-creative` — TikTok/Reels/Shorts ad copy
- `social-content` — Organic content strategy
- `launch-strategy` — App Store launch planning
- `onboarding-cro` — Post-signup activation optimization
- `churn-prevention` — Reduce cancellations once paying users are live
- `paywall-upgrade-cro` — Optimize Starter → Essential/Pro upgrades

Product marketing context is in `.agents/product-marketing-context.md`.

---

## Key Files
```
rork-proptrack-rental-app/
├── app/                        # Screens — Rork owns these
├── context/                    # DataContext, AuthContext — Rork owns
├── types/index.ts              # TypeScript types — Rork owns
├── supabase/schema.sql         # DB schema reference
├── .agents/
│   ├── product-marketing-context.md   # Brand/marketing context for skills
│   ├── skills/                         # Marketing skills
│   └── marketingskills/               # Upstream skills repo
└── CLAUDE.md                   # This file
```
