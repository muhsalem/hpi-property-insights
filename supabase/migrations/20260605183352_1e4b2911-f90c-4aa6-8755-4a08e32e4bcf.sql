-- ═══════════════════════════════════════════════════════════════
-- P0/P1: الأمان + الشهر العقاري + النسخ الاحتياطية + أرشيف النشرات
-- ═══════════════════════════════════════════════════════════════

-- 1) إصلاح سياسة bookings المفتوحة
DROP POLICY IF EXISTS "anyone can submit booking" ON public.bookings;
CREATE POLICY "submit booking with validation" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(trim(full_name)) BETWEEN 2 AND 120 AND
    char_length(trim(phone))     BETWEEN 6 AND 30  AND
    phone ~ '^[0-9+\-\s()]+$' AND
    char_length(property_type)   BETWEEN 2 AND 50 AND
    (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') AND
    (message IS NULL OR char_length(message) <= 2000) AND
    status = 'new'
  );

-- 2) قصر has_role على service_role و postgres فقط (السياسات تنفّذه عبر SECURITY DEFINER بالفعل)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 3) جدول registry_records — الشهر العقاري الإلكتروني
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.registry_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     text NOT NULL,
  appraiser_id    uuid NOT NULL DEFAULT auth.uid(),
  registry_office text NOT NULL,                -- مأمورية الشهر العقاري
  registration_no text,                          -- رقم القيد / رقم الشهر
  registration_date date,
  deed_type       text NOT NULL DEFAULT 'sale', -- sale | gift | mortgage | inheritance | release
  status          text NOT NULL DEFAULT 'unknown', -- registered | pending | unregistered | disputed | unknown
  owner_name      text,
  parties         jsonb DEFAULT '[]'::jsonb,
  document_refs   jsonb DEFAULT '[]'::jsonb,
  notes           text,
  verified_at     timestamptz,
  verified_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registry_status_chk CHECK (status IN ('registered','pending','unregistered','disputed','unknown')),
  CONSTRAINT registry_deed_chk   CHECK (deed_type IN ('sale','gift','mortgage','inheritance','release','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry_records TO authenticated;
GRANT ALL ON public.registry_records TO service_role;
ALTER TABLE public.registry_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appraiser views own registry" ON public.registry_records
  FOR SELECT TO authenticated USING (auth.uid() = appraiser_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "appraiser creates own registry" ON public.registry_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = appraiser_id);
CREATE POLICY "appraiser updates own registry" ON public.registry_records
  FOR UPDATE TO authenticated USING (auth.uid() = appraiser_id);
CREATE POLICY "appraiser deletes own registry" ON public.registry_records
  FOR DELETE TO authenticated USING (auth.uid() = appraiser_id);

CREATE INDEX registry_property_idx ON public.registry_records(property_id);
CREATE INDEX registry_appraiser_idx ON public.registry_records(appraiser_id);
CREATE TRIGGER registry_set_updated_at BEFORE UPDATE ON public.registry_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 4) جدول bulletin_versions — أرشيف نشرات الوزارة
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bulletin_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period      text NOT NULL,                -- "2026-05" أو "2025-Q4"
  source      text NOT NULL DEFAULT 'moh',  -- moh | capmas | fei
  title       text NOT NULL,
  url         text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  checksum    text,
  published_at date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, period)
);

GRANT SELECT ON public.bulletin_versions TO anon, authenticated;
GRANT ALL ON public.bulletin_versions TO service_role;
ALTER TABLE public.bulletin_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads bulletins" ON public.bulletin_versions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins write bulletins" ON public.bulletin_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 5) جدول valuation_backups — نسخة مؤرشفة عند كل توقيع
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.valuation_backups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id  uuid NOT NULL,
  appraiser_id  uuid NOT NULL,
  snapshot      jsonb NOT NULL,
  checksum      text NOT NULL,
  signed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.valuation_backups TO authenticated;
GRANT ALL ON public.valuation_backups TO service_role;
ALTER TABLE public.valuation_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appraiser views own backups" ON public.valuation_backups
  FOR SELECT TO authenticated USING (auth.uid() = appraiser_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "appraiser inserts own backups" ON public.valuation_backups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = appraiser_id);

CREATE INDEX backups_valuation_idx ON public.valuation_backups(valuation_id);
CREATE INDEX backups_appraiser_idx ON public.valuation_backups(appraiser_id);