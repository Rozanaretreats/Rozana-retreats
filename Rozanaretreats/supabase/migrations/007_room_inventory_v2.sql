-- Room inventory v2 — Skyview (24 operational) + Beachvibe (5 standard, 3 premium)
-- Replaces legacy 26× generic Ooty rooms and 4+4 Kannur split.
-- Clears HK tasks for these properties so room IDs stay consistent.
-- Do NOT combine with old schema that uses room_type 'suite' or ooty-r1..26.

UPDATE properties SET
  name = 'Rozana Retreats Skyview',
  short_name = 'Ooty · Skyview',
  room_count = 24
WHERE id = 'ooty-skyview';

UPDATE properties SET
  name = 'Rozana Retreats Beachvibe',
  short_name = 'Kannur · Beachvibe',
  room_count = 8
WHERE id = 'kannur-beachview';

DELETE FROM housekeeping_tasks
WHERE property_id IN ('ooty-skyview', 'kannur-beachview');

DELETE FROM rooms
WHERE property_id IN ('ooty-skyview', 'kannur-beachview');

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.rooms'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%room_type%'
  LOOP
    EXECUTE format('ALTER TABLE rooms DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE rooms ADD CONSTRAINT rooms_room_type_check
  CHECK (room_type IN ('standard', 'premium', 'classic', 'club', 'panorama', 'dorm'));

INSERT INTO rooms (id, property_id, number, building, room_type) VALUES
  ('ooty-cl-01', 'ooty-skyview', 'C01', 'Classic', 'classic'),
  ('ooty-cl-02', 'ooty-skyview', 'C02', 'Classic', 'classic'),
  ('ooty-cl-03', 'ooty-skyview', 'C03', 'Classic', 'classic'),
  ('ooty-cl-04', 'ooty-skyview', 'C04', 'Classic', 'classic'),
  ('ooty-cl-05', 'ooty-skyview', 'C05', 'Classic', 'classic'),
  ('ooty-cl-06', 'ooty-skyview', 'C06', 'Classic', 'classic'),
  ('ooty-cl-07', 'ooty-skyview', 'C07', 'Classic', 'classic'),
  ('ooty-cl-08', 'ooty-skyview', 'C08', 'Classic', 'classic'),
  ('ooty-cl-09', 'ooty-skyview', 'C09', 'Classic', 'classic'),
  ('ooty-cl-10', 'ooty-skyview', 'C10', 'Classic', 'classic'),
  ('ooty-cl-11', 'ooty-skyview', 'C11', 'Classic', 'classic'),
  ('ooty-cl-12', 'ooty-skyview', 'C12', 'Classic', 'classic'),
  ('ooty-cl-13', 'ooty-skyview', 'C13', 'Classic', 'classic'),
  ('ooty-cl-14', 'ooty-skyview', 'C14', 'Classic', 'classic'),
  ('ooty-cl-15', 'ooty-skyview', 'C15', 'Classic', 'classic'),
  ('ooty-cl-16', 'ooty-skyview', 'C16', 'Classic', 'classic'),
  ('ooty-cl-17', 'ooty-skyview', 'C17', 'Classic', 'classic'),
  ('ooty-cb-01', 'ooty-skyview', 'CL01', 'Club', 'club'),
  ('ooty-cb-02', 'ooty-skyview', 'CL02', 'Club', 'club'),
  ('ooty-cb-03', 'ooty-skyview', 'CL03', 'Club', 'club'),
  ('ooty-cb-04', 'ooty-skyview', 'CL04', 'Club', 'club'),
  ('ooty-pn-01', 'ooty-skyview', 'P01', 'Panorama', 'panorama'),
  ('ooty-pn-02', 'ooty-skyview', 'P02', 'Panorama', 'panorama'),
  ('ooty-dm-01', 'ooty-skyview', 'Dorm', 'Travellers', 'dorm');

INSERT INTO rooms (id, property_id, number, building, room_type) VALUES
  ('knr-s1', 'kannur-beachview', 'S1', 'Standard', 'standard'),
  ('knr-s2', 'kannur-beachview', 'S2', 'Standard', 'standard'),
  ('knr-s3', 'kannur-beachview', 'S3', 'Standard', 'standard'),
  ('knr-s4', 'kannur-beachview', 'S4', 'Standard', 'standard'),
  ('knr-s5', 'kannur-beachview', 'S5', 'Standard', 'standard'),
  ('knr-p1', 'kannur-beachview', 'P1', 'Premium', 'premium'),
  ('knr-p2', 'kannur-beachview', 'P2', 'Premium', 'premium'),
  ('knr-p3', 'kannur-beachview', 'P3', 'Premium', 'premium');
