-- Operational manager physical room verification after HK marks done with photo proof

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS manager_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_verified_by TEXT;

COMMENT ON COLUMN housekeeping_tasks.manager_verified_at IS
  'When the operations manager physically verified the room is guest-ready';
COMMENT ON COLUMN housekeeping_tasks.manager_verified_by IS
  'Display name of the manager who verified (demo auth; use profile name at go-live)';
