-- Cleaning time tracking — before photo at start, after photo at finish

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS cleaning_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleaning_finished_at TIMESTAMPTZ;
