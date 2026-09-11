# STOREFY — INCIDENT RESPONSE PLAN

**Document Version:** 1.0.0  
**Classification:** Canonical Operational Security & Reliability Protocol  
**Last Revised:** 2026-09-11  

---

## 1. Incident Severity Classification

| Severity Level | Definition & Criteria | Target Response Time | Escalation Cadence |
| :--- | :--- | :--- | :--- |
| **SEV-1 (CRITICAL)** | Total platform outage, cross-tenant data leak, active exploit, database corruption, or system-wide payment failure. | `< 15 Minutes` | Incident Commander + VP Engineering + Founder immediate notification. Updates every 30 mins. |
| **SEV-2 (HIGH)** | Major feature failure affecting multiple merchants (e.g., checkout initialization failure, carrier rate outage, webhook delays > 30m). | `< 30 Minutes` | On-call engineers + Tech Lead. Updates every 60 mins. |
| **SEV-3 (MEDIUM)** | Degraded performance, single merchant edge-case, non-critical background automation delay, minor UI defect. | `< 4 Hours` | Relevant subsystem engineer. Daily update. |
| **SEV-4 (LOW)** | Cosmetic bug, minor documentation omission, non-blocking administrative dashboard quirk. | Next sprint / Next release | Standard ticket triage. |

---

## 2. Universal 7-Step Incident Response Lifecycle

```
[1. DETECT] ----> [2. CONTAIN] ----> [3. INVESTIGATE] ----> [4. RECOVER]
                                                                  |
[7. PREVENT RECURRENCE] <---- [6. DOCUMENT / POST-MORTEM] <---- [5. VERIFY]
```

1. **Detect**: Triggered via automated alerts (5xx error spikes, `/api/v1/health` failure, rate limiter trip alarms) or merchant escalation.
2. **Contain**: Implement immediate mitigation to stop ongoing harm (isolate compromised credentials, rate limit malicious IPs, enable maintenance mode, pause outbound webhooks).
3. **Investigate**: Correlate structured logs via `traceId`, inspect audit logs (`audit_logs` table), isolate affected store IDs and timestamps.
4. **Recover**: Roll back bad deployments, apply hotfixes, fail over databases, or rotate compromised secrets.
5. **Verify**: Execute automated tests (`npm test`), run health checks (`/api/v1/health`), verify database connection (`npm run db:verify`).
6. **Document**: Compile detailed post-mortem documenting timeline, root cause, impact, and remediation steps.
7. **Prevent Recurrence**: Add regression tests, update architectural invariants, adjust alerting thresholds.

---

## 3. Incident Playbooks by Category

### 3.1 Security Incident (Credential Leak / Unauthorized Access Attempt)
- **Containment:**
  - Revoke affected API key immediately via `revokeApiKey()`.
  - Invalidate staff user session in Supabase Auth GoTrue.
  - If server environment secret leaked, rotate secret in hosted dashboard immediately and trigger redeployment.
- **Investigation:**
  - Search `audit_logs` for `actor_id` or `api_key_id` across all operations.
  - Identify whether any customer PII or financial data was accessed.
- **Recovery & Notification:**
  - Comply with data privacy breach notification timelines where legally required.
  - Issue new credentials over secure out-of-band channels.

### 3.2 Payment Incident (Gateway Failure / Double Charging / Fraud Spike)
- **Containment:**
  - Automatically switch primary gateway routing to healthy secondary gateway (Razorpay <-> Cashfree).
  - Enable high-risk order hold rules in `risk_assessments` module.
- **Investigation:**
  - Query payment gateway reconciliation APIs using `gatewayPaymentId` and `gatewayOrderId`.
  - Reconcile `payments` table against `orders` table.
- **Recovery:**
  - Issue automatic refunds for duplicate captures via refund engine.
  - Re-confirm legitimate pending orders.

### 3.3 Database Incident (Connection Exhaustion / Slow Query Lockup)
- **Containment:**
  - Inspect active connections on PgBouncer.
  - Kill long-running blocking queries using `pg_terminate_backend(pid)`.
- **Investigation:**
  - Analyze query latency profiles; check for missing composite indexes or N+1 query patterns.
- **Recovery:**
  - If necessary, restart connection pooler or scale compute tier.
  - Deploy index migration or query fix.

### 3.4 API Abuse / DDoS Incident
- **Containment:**
  - Cloudflare Under Attack mode enabled for affected hostnames.
  - In-memory rate limiter automatically blocks offending IP addresses with HTTP 429.
  - If targeted at a specific merchant API key, revoke or rate-limit the specific key.
- **Investigation:**
  - Analyze ingress IP distributions, user agents, and requested URL endpoints.

### 3.5 Outbound Webhook Outage
- **Containment:**
  - If partner destination returns continuous 500s or times out, backoff mechanism engages (exponential backoff up to 5 retries).
  - Endpoints exceeding failure thresholds are moved to `PAUSED` status to prevent queue congestion.
- **Investigation:**
  - Review `merchant_webhook_deliveries` failure codes and responses.
- **Recovery:**
  - Merchant updates endpoint URL in developer dashboard; re-enable endpoint and replay queued events.
