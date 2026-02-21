-- ═══════════════════════════════════════════════════════════════════
-- 畫布式編輯器：新增 position_data 欄位 + text_box 類型
-- 請在 Supabase SQL Editor 執行
-- ═══════════════════════════════════════════════════════════════════

-- 1. 新增 position_data JSONB 欄位
ALTER TABLE contents ADD COLUMN IF NOT EXISTS position_data jsonb;

-- 2. 更新 type CHECK 約束，加入 'text_box'
DO $$
DECLARE
    cname text;
BEGIN
    SELECT conname INTO cname
    FROM pg_constraint
    WHERE conrelid = 'public.contents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%';

    IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE contents DROP CONSTRAINT %I', cname);
    END IF;
END $$;

ALTER TABLE contents ADD CONSTRAINT contents_type_check
    CHECK (type IN ('article', 'video', 'image_text', 'text_box'));
