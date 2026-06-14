# Trouble Brewing Coffee House — Project Overview

The single entry point for this project. Read this and `TODO.md` first at the start of any work session.

## What this is

A custom website **and** a Squarespace-style self-editing CMS for **Trouble Brewing Coffee House**, an independent coffee shop in Haddon Heights, NJ that pours La Colombe coffee. The site is a static React app hosted free on GitHub Pages; all editable content lives in Supabase so the owners can change it themselves without touching code.

## The client

- **Tom & Cat (Catherine Hutchison)** — owners (former mortgage bankers who opened a coffee shop).
- **Katie** — General Manager.
- They use **SpotOn** as their POS and are moving online ordering to **SpotOn Order**.
- Staff are affectionately called **"Troublemakers."**

## Accepted package

**"Signature" package — $1,400.** Custom-feeling site, owner self-editing, zero ongoing hosting cost (only ~$20/yr domain).

## Core constraints (these shape every decision)

1. **Static hosting on GitHub Pages** — no server, no server-side secrets on the host. Anything dynamic is baked at build, called client-side with a public/anon key, or handled by a free serverless layer (Supabase Edge Functions).
2. **Owners must self-edit** the site without code. Hard requirement, central design goal.
3. **Zero ongoing hosting cost** — every service has a genuinely free tier.
4. **Custom look & feel** — warm, local, whimsical, independent. Not a template. Styling drops in via design tokens.

## Tech stack (one line)

React + Vite (static) → GitHub Pages, with Supabase (Postgres + Auth + Storage + Edge Functions) as the editable backend, read client-side via the anon key gated by Row Level Security.

## The other docs

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, hosting model, data flow, section-based CMS, `menuService`/SpotOn stub |
| [DESIGN.md](./DESIGN.md) | Look & feel, design tokens, fonts, palette, Gallery Wall concept |
| [CONTENT.md](./CONTENT.md) | Real content: menu+prices, hours, address, Troublemakers, gallery pieces, local businesses |
| [CMS.md](./CMS.md) | Every section type, its `data` shape, renderer, and admin editor |
| [PAGES.md](./PAGES.md) | Each page, its purpose, default sections, route |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Supabase, Google Places, Mailchimp, GA4, SpotOn, env vars |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | GitHub Pages, deploy Action, CNAME, DNS, HTTPS, SPA-routing fix |
| [TODO.md](./TODO.md) | Running build checklist + open client questions |
| [DECISIONS.md](./DECISIONS.md) | Append-only log of meaningful decisions and why |
| [OWNER-GUIDE.md](./OWNER-GUIDE.md) | Plain-English printable how-to for Tom/Cat/Katie |

## Status

v1 foundation in active development on branch `claude/dreamy-hamilton-zzzvbh`. See `TODO.md` for the live checklist.
