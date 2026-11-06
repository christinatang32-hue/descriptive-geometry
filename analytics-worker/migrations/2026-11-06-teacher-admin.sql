-- Existing installations only. Fresh installations use schema.sql.
ALTER TABLE teacher_accounts ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
-- Grant this role only to the owner whose identity was verified in the course setup.
UPDATE teacher_accounts SET is_admin=1 WHERE employee_id='2017011104' AND name='唐玉';
