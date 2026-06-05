-- Remap template slot mondai_id from jlpt_mock_exam_mondai (per-template) to jlpt_mondai (master) by matching level + section code + mondai code.
UPDATE jlpt_mock_exam_template_questions AS tq
SET mondai_id = jm.id
FROM jlpt_mock_exam_mondai AS mm
JOIN jlpt_mock_exam_sections AS ms ON ms.id = mm.section_id
JOIN jlpt_mock_exam_templates AS tpl ON tpl.id = ms.template_id
JOIN jlpt_levels AS lvl ON lvl.id = tpl.level_id
JOIN jlpt_sections AS js ON js.level_id = lvl.id AND js.code = ms.code
JOIN jlpt_mondai AS jm ON jm.section_id = js.id AND jm.code = mm.code
WHERE tq.mondai_id = mm.id;

-- Orphan references (no matching master mondai): clear FK before re-adding constraint.
UPDATE jlpt_mock_exam_template_questions
SET mondai_id = NULL
WHERE mondai_id IS NOT NULL
  AND mondai_id NOT IN (SELECT id FROM jlpt_mondai);

ALTER TABLE jlpt_mock_exam_template_questions
  DROP CONSTRAINT IF EXISTS jlpt_mock_exam_template_questions_mondai_id_fkey;

ALTER TABLE jlpt_mock_exam_template_questions
  ADD CONSTRAINT jlpt_mock_exam_template_questions_mondai_id_fkey
  FOREIGN KEY (mondai_id) REFERENCES jlpt_mondai(id) ON DELETE SET NULL ON UPDATE CASCADE;
