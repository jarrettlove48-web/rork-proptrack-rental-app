# PropTrack — Post-Launch Backlog

> This file tracks features, improvements, and optimizations to build after the App Store launch.
> Update this file as new ideas come up. Prioritize based on user feedback and data.
> Owner: Jarrett Love | Last updated: March 2026

---

## How to use this file
- **Status:** `⬜ Backlog` → `🔄 In Progress` → `✅ Done`
- **Owner:** `Rork` (app), `Claude.ai` (Supabase/infra), `Here` (landing/API), `Claude Code` (config/marketing)
- Add new items at the bottom of the relevant section
- Move to Done with a date when complete

---

## 💰 Monetization

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Annual billing — Essential ($90/yr = 2 months free) | Add to Stripe + landing page toggle | Here |
| ⬜ | Annual billing — Pro ($190/yr = 2 months free) | Add after first 50 paying users | Here |
| ⬜ | Annual plan toggle on pricing page | Show monthly/annual with savings highlighted | Here |
| ⬜ | Post-activation annual upsell email | Send 14 days after signup: "Save 2 months with annual" | Here |
| ⬜ | RevenueCat → Supabase plan sync | Wire RevenueCat webhook to update profiles.plan | Rork + Claude.ai |
| ⬜ | Upgrade prompt A/B test | Test different paywall copy and timing | Rork |
| ⬜ | Referral program | "Give 1 month free, get 1 month free" | Here + Rork |

---

## 📱 App Features

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Supabase Realtime for messages | Replace polling with realtime subscription | Rork |
| ⬜ | Push notifications (real) | Wire expo-notifications to actual events | Rork |
| ⬜ | Tenant invite code redemption | Set tenant_user_id on unit when tenant redeems code | Rork |
| ⬜ | Photo uploads on maintenance requests | S3 or Supabase Storage | Rork + Claude.ai |
| ⬜ | Lease document storage | Pro feature — upload/store lease PDFs | Rork + Claude.ai |
| ⬜ | Rent payment portal | Link to external payment (Zelle, Venmo, etc.) | Rork |
| ⬜ | Vendor directory | Save contractor contacts per property | Rork |
| ⬜ | Inspection checklists | Pre-built templates for move-in/out | Rork |
| ⬜ | Android app | Build after iOS launch and initial traction | Rork |

---

## 🌐 Landing Page & Marketing Site

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Blog / content section | SEO-focused landlord content | Here |
| ⬜ | About page | Founder story, mission, why PropTrack | Here |
| ⬜ | Testimonials section | Add after first real user reviews | Here |
| ⬜ | App Store badge + download link | Add once app is live | Here |
| ⬜ | Annual pricing toggle on landing page | Show yearly savings | Here |
| ⬜ | Exit intent popup | Capture email before leaving pricing page | Here |
| ⬜ | Live chat / support widget | Intercom or Crisp for onboarding support | Here |

---

## 📧 Email & Communications

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Waitlist nurture sequence | 3-5 email drip for waitlist → convert to paid | Here |
| ⬜ | Welcome onboarding sequence | Day 1, 3, 7 emails after signup | Here |
| ⬜ | Dunning emails for failed payments | Payment failed → retry prompts | Here |
| ⬜ | Renewal reminder emails | 7 days before annual renewal | Here |
| ⬜ | Cancellation save flow | Exit survey + save offer | Here |

---

## 🔍 SEO & Growth

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | SEO audit and on-page optimization | Target: "landlord maintenance app", "rental tracker" | Claude Code |
| ⬜ | Schema markup | LocalBusiness, SoftwareApplication schema | Claude Code |
| ⬜ | Competitor alternative pages | "PropTrack vs TurboTenant", "vs Landlord Studio" | Here |
| ⬜ | Free landlord tools | Rent increase calculator, lease checklist PDF | Here |
| ⬜ | GA4 + conversion tracking | Track pricing clicks, waitlist signups, purchases | Here |

---

## 🏗️ Infrastructure & DevOps

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Supabase Storage for receipts/photos | Configure buckets + RLS policies | Claude.ai |
| ⬜ | Error monitoring (Sentry) | Add to Expo app and Vercel functions | Rork + Here |
| ⬜ | Uptime monitoring | Pingdom or Better Uptime for proptrack.app | Here |
| ⬜ | Stripe test mode checkout | Add ?test=true param for internal testing | Here |
| ⬜ | Database backups policy | Verify Supabase PITR is enabled | Claude.ai |

---

## 📊 Analytics & Insights

| Status | Feature | Notes | Owner |
|---|---|---|---|
| ⬜ | Admin dashboard | Internal view of signups, MRR, active users | Here |
| ⬜ | Stripe MRR tracking | Connect to dashboard or use Stripe's built-in | — |
| ⬜ | Mixpanel or PostHog | In-app event tracking for feature usage | Rork |
| ⬜ | NPS survey | In-app after 30 days of usage | Rork |

---

## ✅ Done

| Date | Feature | Notes |
|---|---|---|
| Mar 2026 | Stripe checkout on proptrack.app | Essential + Pro |
| Mar 2026 | Stripe webhook → Supabase plan sync | Via /api/stripe-webhook |
| Mar 2026 | Manage Billing button in app | Links to Stripe customer portal |
| Mar 2026 | stripe_customer_id + plan_source on profiles | Supabase migration applied |
| Mar 2026 | Annual plans research | Defer to post-launch (50+ paying users) |
