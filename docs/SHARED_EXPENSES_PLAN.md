# Shared expenses (Splitwise-style) — future plan

Status: **Deferred.** Documented for a later release. Do not implement until explicitly scheduled.

Related context: BachatCoach is currently single-user. Personal transactions, goals, and loan contacts stay as they are. Shared bills are a **new domain**, not an extension of `Contact` loans or personal `Transaction` records.

---

## Problem

Friends spend money together. If both have BachatCoach accounts, anyone should be able to:

- Add a shared payment
- Define how the total is divided (one pays all, equal split, custom %, exact amounts)
- See balances and settle up

Similar to Splitwise, kept simple and fitting BachatCoach.

---

## Current product constraints

| Area | Today |
|------|--------|
| Users | Identified by **email** / Mongo `_id` / optional Google ID — **no phone on User** |
| Contacts | Private loan ledgers (name + phone); **not** linked to other User accounts |
| Transactions | Personal expense / income / savings only |
| Friend / invite / group | **None** |

So shared expenses need new models and APIs. Do **not** reuse loan contacts as the multi-user sync layer. Optional later: export an unpaid split balance into a personal loan contact.

---

## Email / multi-account testing (Resend)

OTP uses Resend (`EMAIL_FROM` often `onboarding@resend.dev`).

- With Resend’s free shared sender, OTPs often only deliver to the **Resend account email** until a **custom domain** is verified.
- This is a **mail provider** limit, not an app registration limit.

**While developing / testing multiple users:**

1. Unset `RESEND_API_KEY` → OTP codes log to the **server console**, or
2. Use **password register** (`POST /register`), or
3. Use **Google Sign-In** with different accounts

**Before production friend invites:** verify your own domain on Resend and set e.g. `EMAIL_FROM=BachatCoach <noreply@yourdomain.com>`.

Friend invites should use **email** (matches auth). Do not build invites on phone until User has a verified phone field.

---

## Recommended product shape

### Core bill

1. Total amount + who paid  
2. Split method  
3. Balances between members (who owes whom)

### Split methods (v1)

- `equal` — divide by N  
- `exact` — each person an amount (must sum to total)  
- `percent` — each a % (must sum to 100)  
- `full` — one person owes the whole amount to the payer (payer alone = no debt)

### UI placement

New tab or section: **Split / Shared** — do **not** mix into the personal Expenses list.

Screens (rough):

- Friends — invite / accept  
- Groups or 1‑to‑1 list + balances  
- Add shared expense — amount, payer, split UI  
- Settle — pick friend, amount, confirm  

Personal Home / Expenses unchanged. Optional: when *you* pay a shared bill, “Also add to my expenses” so the personal dashboard stays accurate.

---

## Suggested data model

| Piece | Purpose |
|--------|---------|
| **Friendship / Invite** | Link two Users by email; pending → accepted |
| **Group** | Name + members (`userId`s) — Phase 2 |
| **SharedExpense** | `groupId` or pair, `amount`, `paidBy`, `splitMethod`, `shares[]`, `note`, `date` |
| **Settlement** | A paid B amount (clears balance) |

Balances = sum of “you owe” − “owed to you” from expenses + settlements.

---

## Phased delivery

| Phase | Scope | Notes |
|--------|--------|--------|
| **1 – Friends + 1‑to‑1** | Invite by email, add expense, equal / exact / %, balances, settle | **Ship this first** |
| **2 – Groups** | Multi-member groups, group feed | Trips / flatmates |
| **3 – Polish** | Notifications, simplify debts, receipt on shared bill, “add to my expenses” | Delight |

**Recommendation:** implement Phase 1 only when this feature is scheduled. Groups and polish later.

---

## Product rules (decide at build time)

- Only accepted friends (or group members) see shared data  
- Same expense record for all parties (server is source of truth)  
- Edit/delete policy: creator only vs any member — decide early  
- Currency: MVP = group or payer currency; per-user FX later  
- Offline not required for v1  

---

## Invite flow (matches auth)

1. User A enters friend’s **email** → create invite  
2. If account exists → in-app (and later push) “Accept”  
3. If not → “Invite to BachatCoach” (email / WhatsApp deep link)  
4. After accept → friendship ready for splits  

---

## Suggested build order (when scheduled)

1. Create 2+ test accounts (password or console OTP)  
2. Implement Phase 1 APIs + mobile Split section  
3. Verify Resend domain before inviting real users  

---

## Out of scope for v1

- Bank interest / payment rails  
- Replacing the existing loans feature  
- Phone-based friend discovery  
- Full Splitwise parity (comments, categories sync, etc.)
