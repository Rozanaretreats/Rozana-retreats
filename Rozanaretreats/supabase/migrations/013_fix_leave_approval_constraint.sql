-- 013 — Fix leave approval: staff requests can be approved while requested_by stays 'staff'
-- Run in Supabase SQL Editor (safe to re-run).

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_requested_by_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_requested_by_check
  CHECK (requested_by IN ('staff', 'manager', 'system'));

NOTIFY pgrst, 'reload schema';
