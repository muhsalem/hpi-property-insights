-- 1) إضافة بيانات تعداد CAPMAS على جدول districts
ALTER TABLE public.districts
  ADD COLUMN IF NOT EXISTS population integer,
  ADD COLUMN IF NOT EXISTS households integer,
  ADD COLUMN IF NOT EXISTS area_km2 numeric,
  ADD COLUMN IF NOT EXISTS density numeric,
  ADD COLUMN IF NOT EXISTS buildings_count integer,
  ADD COLUMN IF NOT EXISTS housing_units integer,
  ADD COLUMN IF NOT EXISTS net_migration numeric,
  ADD COLUMN IF NOT EXISTS growth_rate numeric,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS census_year integer DEFAULT 2023;

-- 2) إضافة عدد المباني وعدد الوحدات على areas
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS buildings_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_units integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS population integer DEFAULT 0;

-- 3) جدول الحجوزات للنموذج العام
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  property_type text NOT NULL,
  district text,
  area_sqm numeric,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit booking"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins view bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));