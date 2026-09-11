# STOREFY — DISASTER RECOVERY & CONTINUITY PLAN

**Document Version:** 1.0.0  
**Classification:** Canonical Internal Operational Runbook  
**Last Revised:** 2026-09-11  

---

## 1. Internal Operational Targets (RPO & RTO)

> [!IMPORTANT]
> These metrics represent **internal engineering and operational targets**. They are strictly internal objectives and do not represent external contractual SLAs or consumer warranties.

- **Recovery Point Objective (RPO):** `< 1 Hour`  
  *The maximum acceptable age of data that must be recovered from backup snapshots in the event of catastrophic data corruption or primary region disaster.*
- **Recovery Time Objective (RTO):** `< 2 Hours`  
  *The maximum acceptable duration required to restore database state, verify schema integrity, re-point platform routing, and resume full platform services.*

---

## 2. Disaster Scenarios & Playbooks

### Scenario A: Primary Database Regional Outage / Host Failure
1. **Detection:**
   - Synthetic health check `/api/v1/health` reports `database: "DOWN"` and returns HTTP 503.
   - Cloudflare / Vercel alerts trigger on 5xx error rate spike (> 2% for 3 minutes).
2. **Immediate Containment:**
   - Verify failure status on Supabase Cloud Status Dashboard and AWS RDS health metrics.
   - Post platform maintenance notification via Cloudflare Waiting Room / Status Page.
3. **Recovery Steps:**
   - If primary host fails, initiate failover to standby replica (automated via Supabase HA).
   - If total region is impaired, restore latest point-in-time recovery (PITR) backup snapshot to secondary cloud region.
   - Update `DATABASE_URL` and `DIRECT_URL` in Vercel Environment Variables (`Production`).
   - Trigger zero-downtime redeployment via Vercel CLI or Git webhook.
4. **Verification:**
   - Execute `npm run db:verify` against new connection string.
   - Execute `npm run db:migrate` to verify zero pending migrations.
   - Validate `/api/v1/health` reports `status: "HEALTHY"` and `database: "UP"`.

---

### Scenario B: Accidental Data Corruption or Malicious Data Modification
1. **Detection:**
   - Financial ledger reconciliation failure detected via automated integrity check.
   - Unhandled exception spikes in order or inventory modules.
2. **Immediate Containment:**
   - Put affected merchant store into maintenance mode or suspend automated webhook processing.
   - Lock database write access for the corrupted tenant using RLS or role suspension.
3. **Recovery Steps:**
   - Extract historical state of corrupted tables from PostgreSQL WAL logs or Point-in-Time Recovery (PITR) snapshot to a staging database.
   - Run targeted diff script to identify altered or corrupted rows.
   - Replay append-only ledger entries (`inventory_movements`, `loyalty_ledger`, `wallet_ledger`, `gift_card_transactions`) to reconstruct accurate balances.
   - Execute corrective SQL patch transaction.
4. **Verification:**
   - Run `tests/unit/production-hardening/financial-reconciliation.test.ts` logic against restored tables.
   - Re-enable store write permissions.

---

### Scenario C: Payment Gateway Outage (Razorpay / Cashfree)
1. **Detection:**
   - Checkout payment attempts return HTTP 502/504 external service errors.
   - Spikes in `EXTERNAL_SERVICE_ERROR` logged by error tracking.
2. **Immediate Containment:**
   - Automatic routing switches checkout primary gateway to secondary healthy gateway (e.g. Cashfree fallback if Razorpay fails, or Cash on Delivery where eligible).
   - Orders placed remain in `PENDING_PAYMENT` with active inventory reservation; no orders are prematurely cancelled.
3. **Recovery Steps:**
   - Monitor provider status. Once restored, query gateway API for pending transactions and reconcile order states.
   - Replay any delayed webhooks stored in the dead-letter log.

---

## 3. Backup Architecture & Verification

1. **Automated Continuous WAL Archiving:**
   - Point-in-Time Recovery (PITR) with continuous Write-Ahead Log (WAL) archiving managed via Supabase.
   - Enables point-in-time restoration to any second within the retention window (7–30 days depending on plan).
2. **Daily Logical Database Dumps:**
   - Automated nightly pg_dump executed at 02:00 UTC and stored in encrypted, versioned object storage with 30-day lifecycle expiration.
3. **Merchant Data Portability Snapshots:**
   - In-app merchant backup engine (`src/modules/portability/backup-service.ts`) produces encrypted JSON metadata snapshots on demand.
4. **Controlled Restoration Drill Runbook:**
   - Step 1: Spin up isolated test PostgreSQL instance.
   - Step 2: Restore latest nightly snapshot:
     ```bash
     pg_restore -d postgresql://restore-test:pass@localhost:5432/storefy_restored backup_latest.dump
     ```
   - Step 3: Run schema and integrity validation:
     ```bash
     DATABASE_URL=postgresql://restore-test:pass@localhost:5432/storefy_restored npm run db:verify
     ```
   - Step 4: Validate table count, row counts on `products`, `orders`, `inventory`, `users`.

---

## 4. Roles & Escalation Directory

| Role | Primary Responsibility | Primary Escalation Contact |
| :--- | :--- | :--- |
| **Incident Commander** | Coordinates overall recovery response, decisions, and customer communications | Engineering Lead |
| **Database Administrator** | Executes PITR recovery, WAL replaying, and connection string updates | Platform / Infrastructure Engineer |
| **Application Lead** | Validates health probes, deploys hotfixes, verifies zero-downtime routing | Full-Stack Technical Lead |
| **Merchant Communications** | Manages status page updates and direct merchant notifications | Customer Success Manager |
