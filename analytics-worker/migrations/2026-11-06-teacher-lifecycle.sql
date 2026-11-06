-- Existing teacher accounts remain active. Deactivation retains teaching history.
ALTER TABLE teacher_accounts ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
