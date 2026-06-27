-- HK staff leave requests — pending until manager/owner approves

ALTER TABLE leave_records
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS requested_by TEXT NOT NULL DEFAULT 'manager',
  ADD COLUMN IF NOT EXISTS staff_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE leave_records SET status = 'approved' WHERE status IS NULL;
UPDATE leave_records SET requested_by = 'manager' WHERE requested_by IS NULL;

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_status_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE leave_records DROP CONSTRAINT IF EXISTS leave_records_requested_by_check;
ALTER TABLE leave_records ADD CONSTRAINT leave_records_requested_by_check
  CHECK (requested_by IN ('staff', 'manager'));
