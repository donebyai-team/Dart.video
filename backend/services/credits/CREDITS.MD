# Credits System Specification

## Overview

The credits system is based on **actual provider cost**.

- **1 Credit = 1 Cent**
- Actual provider cost is calculated from usage (tokens, audio duration, etc.).
- Charged credits = `original_amount × multiplier`.
- Credits are tracked using an immutable ledger.
- Failure to record credits must **never fail the user flow**. Errors are logged only.

---

# Credit Ledger

Create a `credits_ledger` table.

| Field        | Description                                                                        |
|--------------|------------------------------------------------------------------------------------|
| id           | unique uuid                                                                        |
| org_id       | Organization ID                                                                    |
| reference_id | Optional reference (e.g. Video ID)                                                 |
| type         | `CREDIT` or `DEBIT`                                                                |
| action       | Action performed (SCRIPT_GENERATION etc.)                                          |
| cost         | Actual provider cost (credits before markup, 0 when the type is CREDIT, default 0) |
| amount       | Credits deducted/added after applying multiplier, , default 0                                 |
| metadata     | JSON containing provider, model, usage, multiplier, etc.                           |
| created_at   | Timestamp                                                                          |

Notes:

- Ledger is append-only.
- Available credits are calculated by:
  ```
  SUM(charged_amount)
  ```
- Balance is allowed to become negative.

---

# Provider Pricing Registry

Maintain a centralized registry containing provider pricing.

Example:

```text
Provider
Model
Input Cost / 1M Tokens
Output Cost / 1M Tokens
Cached Input Cost / 1M Tokens
```

The registry is used to calculate the actual provider cost from usage.

---

# Action Cost Registry

Maintain a hardcoded map of **estimated costs** for each action enum.

Example:

```text
SCRIPT_GENERATION
SCENES_GENERATION
ANIMATION_GENERATION
CATEGORIZE_SCENE
VOICE_GENERATION
ANALYZE_IMAGE
EXTRACT_TEMPLATE_CONFIG
```

This registry is only used for estimating credits before executing a workflow.

Expose:

```go
GetEstimatedCredits(actions []Action) int
```

---

# Credit Calculation

For usage-based services:

1. Calculate actual provider cost from usage.
2. Convert to credits.
3. Apply multiplier.

```text
charged_amount = original_amount × multiplier
```

If an action is intentionally free:

```text
original_amount > 0
charged_amount = 0
```

This allows tracking actual infrastructure cost while not charging users.

---

# Credits Service

Expose:

```go
ChargeCredits(ctx, referenceID, provider, model, usage, action) context will have orgID
GetAvailableCredits(orgID, referenceID?)
GetEstimatedCredits(actions)
GetRechargeHistory(...)
```

### Responsibilities

- Calculate provider cost.
- Apply multiplier.
- Insert ledger entries.
- Return available balance.
- Return recharge history (`CREDIT` entries).

---

# Service Integration

## LLM Service

After every successful LLM call:

1. Read usage.
2. Send usage, provider and model to Credits Service.
3. Credits Service calculates cost and inserts a ledger entry.

---

## Audio Service

Follow the same flow using provider-specific usage.

---

# Portal Middleware

Create an optional middleware.

Responsibilities:

- Fetch available credits for the organization. Return error if not enough credits
- If available, Store available credits in request context.
- Not every API requires this middleware.

Individual handlers may call:

```go
GetEstimatedCredits(actions)
```

to verify sufficient credits before starting a workflow.

---

# Free Credits

On organization registration:

- Insert an initial `CREDIT` ledger entry containing the default free credits.

---

# Portal RPC APIs

## GetCredits

Supports filters:

- orgID
- referenceID (optional)
- includeLedger (bool)

Returns:

```go
{
    availableCredits,
    ledger // optional, CREDIT entries only
}
```

The ledger should support filtering by organization and reference ID.

---

# Design Principles

- Immutable ledger (never update existing entries).
- Provider pricing centralized in a single registry.
- Estimated costs are separate from actual costs.
- Provider cost is always recorded, even for free actions.
- Credit calculation failures must never fail the primary request.
- Credits are calculated from the ledger (`SUM(charged_amount)`); no separate balance table is maintained.
- All registry, credit related code should be inside credits folder
- Keep the credits service modular using interfaces, log errors always
- Availavle Credits checks should only be done in the middleware and the rpc handlers. Services should not do this

# Files to be changes
RPC and protos are generated. 

Add the table
- [000013_add_credits_ledger.down.sql](../../datastore/psql/migrations/000013_add_credits_ledger.down.sql)
- [000013_add_credits_ledger.up.sql](../../datastore/psql/migrations/000013_add_credits_ledger.up.sql)

SQL queries
[credits](../../datastore/psql/sql/credits)

Portal handler
[handle_credits.go](../../portal/handle_credits.go)

Middleware
[middleware](../../auth/middleware)

By default the context have these ids available, you don't need to change anything
[tags.go](../../agent/llm/tags.go)

in llm.go use the collector usage to get the usage, make it generic so every function can use.
