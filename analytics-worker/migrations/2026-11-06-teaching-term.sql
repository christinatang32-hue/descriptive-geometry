-- Existing installations only. Fresh installations use schema.sql.
ALTER TABLE teaching_groups ADD COLUMN academic_year TEXT NOT NULL DEFAULT '2026-2027';
ALTER TABLE teaching_groups ADD COLUMN semester INTEGER NOT NULL DEFAULT 1;
ALTER TABLE teaching_group_students ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS teaching_groups_term_label_idx
  ON teaching_groups(owner_id,academic_year,semester,label);
