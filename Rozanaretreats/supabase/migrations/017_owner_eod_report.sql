-- 017 — End-of-Day owner report send log (Module 4)
-- Idempotency + audit for the WhatsApp owner report Edge Function
-- (send-owner-eod-report). One row per (report_date, property_id).
-- Service-role only: the Edge Function writes here; no anon/auth access.

CREATE TABLE IF NOT EXISTS report_send_log (
  id           BIGSERIAL PRIMARY KEY,
  report_date  DATE NOT NULL,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  recipients   TEXT[] NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
  detail       TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_date, property_id)
);

CREATE INDEX IF NOT EXISTS idx_report_send_log_date
  ON report_send_log(report_date);

ALTER TABLE report_send_log ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: only the service role (Edge Function) may read/write.
COMMENT ON TABLE report_send_log IS
  'Idempotency + audit for the EOD WhatsApp owner report (Module 4). Service-role only.';
