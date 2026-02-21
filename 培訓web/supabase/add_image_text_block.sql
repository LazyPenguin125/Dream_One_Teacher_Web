-- ═══════════════════════════════════════════════════════════════════
-- 新增「圖文區塊」功能（請在 Supabase SQL Editor 執行）
-- ═══════════════════════════════════════════════════════════════════

-- 1. 更新 contents.type CHECK 限制，加入 'image_text'
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
    CHECK (type IN ('article', 'video', 'image_text'));

-- 2. 建立 content-images 公開 bucket（存放課程圖文區塊的圖片）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'content-images',
    'content-images',
    true,
    10485760,
    ARRAY['image/jpeg','image/png','image/gif','image/webp']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 3. Storage 政策：管理員可上傳
CREATE POLICY "Admins can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'content-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Storage 政策：所有人可瀏覽（公開 bucket）
CREATE POLICY "Anyone can view content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

-- 5. Storage 政策：管理員可刪除
CREATE POLICY "Admins can delete content images"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'content-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Storage 政策：管理員可更新（覆蓋上傳）
CREATE POLICY "Admins can update content images"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'content-images'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
