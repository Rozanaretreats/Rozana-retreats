-- 014 — HK cleaning checklist + random verification photo metadata

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS cleaning_checklist JSONB;
