# triva

Need to build:

@trivajs/ua-parser - AI Traffic, AI Crawler, & Bot Traffic detection
@trivajs/cache - Local short-term DB (Secure)
- Request Logging & Sorting (Migrate from Apiro base)
- IP Rate Limiter with temporary restrictions
- Runtime Analytics (Migrate from Apiro base)
- Request Detail Analytics (overview)

----

# Rate Limiting, Parsing & Throttle Control

## Overview

This middleware provides an integrated **rate limiting, request parsing, and throttle control layer**
designed for enterprise environments and open-source deployments that require predictable,
auditable traffic behavior.

The throttle is **not a firewall** and **not a standalone security control**.
It is a deterministic, behavior-aware mechanism that operates entirely within the request lifecycle
to promote system stability, fairness, and availability.

The parser and throttle components are designed to work together to consistently evaluate
request identity signals, client behavior, and traffic patterns across environments.

---

## Design Principles

- **Deterministic behavior**  
  Identical inputs produce identical outcomes.

- **Transparency by default**  
  Every enforcement decision includes a documented reason code.

- **Fail-safe operation**  
  Throttle degrades gracefully and never blocks traffic silently.

- **Storage-agnostic architecture**  
  Compatible with any compliant persistence layer.

- **Operational simplicity**  
  No background workers, timers, or hidden state.

These principles align with common enterprise expectations for reliability, observability,
and operational control.

---

## Request Lifecycle Integration

Throttle executes early in the middleware pipeline and may short-circuit request processing
when limits are exceeded.

```
Request
  ↓
Parser (identity & client signals)
  ↓
Throttle Evaluation
  ↓
Allowed  → Continue middleware chain
Blocked  → HTTP 429 + reason code
```

When enabled, a structured decision snapshot is attached to the request object for logging,
metrics, and downstream inspection.

```js
req.triva.throttle = {
  restricted: false,
  reason: 'ok'
};
```

This object is immutable for the lifetime of the request and safe to expose to logging,
metrics, tracing, and audit tooling.

---

## Rate Limiting Model

Throttle evaluates **behavior over time**, rather than fixed counters or static reset windows.

### Supported Controls

- **Sliding-window limits**  
  Prevent sustained abuse without artificial reset boundaries.

- **Burst tolerance**  
  Allows short spikes caused by retries, refreshes, or UI polling.

- **Identity-aware tracking**  
  Uses IP address and User-Agent as signals, with controlled fallback when rotation is detected.

- **Automated client weighting**  
  Known bots and AI crawlers consume limits faster than human-driven traffic.

- **Progressive enforcement**  
  Repeated violations escalate into temporary restrictions that decay automatically.

---

## Decision Transparency

Every throttle evaluation returns a normalized result object:

```js
{
  restricted: true | false,
  reason: string
}
```

### Standard Reason Codes

| Code               | Description |
|--------------------|-------------|
| `ok`               | Request permitted |
| `burst_limit`      | Excessive requests in a short interval |
| `sliding_window`   | Rolling quota exceeded |
| `ua_rotation`      | Excessive User-Agent variance |
| `auto_ban`         | Temporary restriction due to repeated violations |
| `invalid_identity` | Missing or unusable identity signals |

Reason codes are stable and intended to be:

- Returned to clients
- Logged internally
- Emitted as metrics
- Used in alerts and dashboards

---

## Configuration Examples

### Baseline Policy

```js
createMiddleware({
  throttle: {
    limit: 1500,
    window_ms: 24 * 60 * 60 * 1000,
    burst_limit: 25,
    burst_window_ms: 1000
  }
});
```

This policy:

- Allows 1,500 requests per rolling 24-hour window
- Smooths bursts up to 25 requests per second
- Applies escalating enforcement on repeat violations

---

### Tier-Aware Policies

Throttle supports dynamic policy resolution per request, enabling differentiated access models
without multiple middleware instances.

```js
createMiddleware({
  throttle: {
    limit: 1000,
    window_ms: 86400000,

    policies: ({ context }) => {
      if (context.tier === 'enterprise') {
        return {
          limit: 100000,
          burst_limit: 200
        };
      }

      if (context.tier === 'pro') {
        return {
          limit: 10000
        };
      }
    }
  }
});
```

Usage example:

```js
throttle.check(ip, ua, { tier: user.plan });
```

---

## Common Deployment Scenarios

### Public APIs
Mitigates scraping, enumeration, and accidental overload while preserving legitimate bursty usage.

### Internal Dashboards
Absorbs UI polling and refresh behavior without locking out operators.

### Mixed Human and Automated Traffic
Allows automation while enforcing stricter limits for non-interactive clients.

### Multi-Tier Products
Supports free, paid, and enterprise access levels within a single deployment.

---

## SOC 2 / ISO Alignment Notes

This throttle is designed to support, but not independently satisfy, common control objectives
found in SOC 2 and ISO 27001 environments.

### Relevant Control Themes

- **Availability**  
  Protects systems from resource exhaustion caused by abusive or accidental traffic patterns.

- **Change predictability**  
  Deterministic logic ensures repeatable outcomes for audit and review.

- **Monitoring and logging**  
  Explicit decision metadata enables traceability and post-incident analysis.

- **Least surprise**  
  No hidden enforcement, permanent bans, or undocumented behavior.

Throttle should be deployed alongside formal access controls, authentication,
authorization, and monitoring to meet compliance requirements.

---

## Non-Goals & Threat Model

### Non-Goals

Throttle does **not**:

- Act as a security perimeter or firewall
- Perform user authentication or authorization
- Inspect request payloads
- Fingerprint users beyond IP and User-Agent
- Permanently block clients

### Threat Model Assumptions

Throttle is designed to address:

- Accidental overload
- Misconfigured clients
- Opportunistic scraping
- Non-adaptive automated traffic

Throttle is **not** designed to defend against:

- Targeted denial-of-service attacks
- Credential theft or account takeover
- Malicious actors with distributed infrastructure

These threats must be mitigated using dedicated security controls.

---

## Operational Notes

- Throttle is a **stability and fairness mechanism**, not a security boundary
- Identity signals are treated probabilistically
- Enforcement is temporary and self-decaying
- Authentication, authorization, and validation must be implemented separately

---

## Philosophy

Throttle prioritizes **predictability over punishment**.

If a request is blocked, the system explains why.
If behavior improves, restrictions lift automatically.

No hidden state.  
No silent failures.  
No permanent bans.
