
-- 1. Create cities table
CREATE TABLE public.cities (
  id text PRIMARY KEY,
  name text NOT NULL,
  governorate text NOT NULL DEFAULT 'بورسعيد',
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads cities" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins write cities" ON public.cities FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2. Add city_ref column to districts (FK to cities)
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS city_ref text REFERENCES public.cities(id) ON DELETE CASCADE;

-- 3. Clear existing data (cascade clears areas)
DELETE FROM public.areas;
DELETE FROM public.districts;

-- 4. Seed cities
INSERT INTO public.cities (id, name, color) VALUES
  ('ps', 'بورسعيد', '#0ea5e9'),
  ('pf', 'بورفؤاد', '#10b981');

-- 5. Seed districts (أحياء)
INSERT INTO public.districts (id, name, city_id, city_name, city_ref, color) VALUES
  ('d_sharq',    'حي الشرق',                'ps', 'بورسعيد', 'ps', '#ef4444'),
  ('d_arab',     'حي العرب',                'ps', 'بورسعيد', 'ps', '#f97316'),
  ('d_manakh',   'حي المناخ',               'ps', 'بورسعيد', 'ps', '#eab308'),
  ('d_dawahi',   'حي الضواحي',              'ps', 'بورسعيد', 'ps', '#22c55e'),
  ('d_zohour',   'حي الزهور',               'ps', 'بورسعيد', 'ps', '#06b6d4'),
  ('d_janoub',   'حي الجنوب',               'ps', 'بورسعيد', 'ps', '#6366f1'),
  ('d_muthalath','حي المثلث الجديد (الزراعات)','ps','بورسعيد', 'ps', '#a855f7'),
  ('d_pf1',      'حي بورفؤاد أول',          'pf', 'بورفؤاد', 'pf', '#14b8a6'),
  ('d_pf2',      'حي بورفؤاد ثاني',         'pf', 'بورفؤاد', 'pf', '#0891b2');

-- 6. Seed areas (مناطق سكنية)
INSERT INTO public.areas (id, name, district_id, lat, lng, base_price, growth, land_psqm, infra_rating, safety_rating, services_rating, transport_rating) VALUES
  -- حي الشرق
  ('a_zayed','الشيخ زايد','d_sharq',31.2750,32.3050,18000,0.08,12000,8,8,8,7),
  ('a_taawoun','التعاونيات','d_sharq',31.2720,32.3000,16500,0.07,11000,8,8,7,7),
  ('a_latin','الحي اللاتيني','d_sharq',31.2680,32.2980,22000,0.09,15000,9,9,9,8),
  ('a_abbas','أبو العباس','d_sharq',31.2700,32.3020,15000,0.06,10000,7,8,7,7),
  ('a_omar','عمر بن الخطاب','d_sharq',31.2730,32.3070,14500,0.06,9500,7,7,7,7),
  -- حي العرب
  ('a_shohada','الشهداء','d_arab',31.2630,32.2950,13000,0.05,9000,7,7,7,7),
  ('a_kuwait','الكويت','d_arab',31.2600,32.2920,14000,0.06,9500,7,7,7,7),
  ('a_salam','السلام','d_arab',31.2580,32.2900,13500,0.05,9200,7,7,7,7),
  ('a_othman','عثمان بن عفان','d_arab',31.2620,32.2970,12500,0.05,8500,6,7,7,6),
  -- حي المناخ
  ('a_dawahi_old','الضواحي القديمة','d_manakh',31.2550,32.3000,11500,0.04,8000,6,7,7,7),
  ('a_efrang','الإفرنج','d_manakh',31.2560,32.3030,15500,0.06,10500,8,8,8,8),
  ('a_italian','الإيطالي','d_manakh',31.2570,32.3050,16000,0.06,11000,8,8,8,8),
  ('a_corniche','الكورنيش','d_manakh',31.2540,32.3080,20000,0.08,14000,9,9,9,8),
  -- حي الضواحي
  ('a_ziraat','الزراعات','d_dawahi',31.2450,32.2850,9500,0.04,6500,5,6,6,6),
  ('a_muth','المثلث','d_dawahi',31.2480,32.2870,10000,0.04,7000,6,6,6,6),
  ('a_hassan','أبو الحسن','d_dawahi',31.2420,32.2820,9000,0.03,6000,5,6,5,6),
  ('a_tall','التل الكبير','d_dawahi',31.2400,32.2800,8500,0.03,5800,5,6,5,5),
  -- حي الزهور
  ('a_zoh1','الزهور الأولى','d_zohour',31.2350,32.2900,12000,0.05,8200,7,7,7,7),
  ('a_zoh2','الزهور الثانية','d_zohour',31.2370,32.2920,11500,0.05,7900,7,7,7,7),
  ('a_zoh3','الزهور الثالثة','d_zohour',31.2390,32.2940,11000,0.04,7600,6,7,7,7),
  ('a_nasr','النصر','d_zohour',31.2330,32.2880,10500,0.04,7300,6,7,6,6),
  -- حي الجنوب
  ('a_shaaby','المساكن الشعبية','d_janoub',31.2250,32.2820,8500,0.03,5800,5,6,5,5),
  ('a_eskan','الإسكان الاجتماعي','d_janoub',31.2230,32.2800,9000,0.04,6200,6,6,6,6),
  ('a_october','6 أكتوبر','d_janoub',31.2280,32.2850,10000,0.04,6800,6,7,6,6),
  ('a_raswa','الرسوة','d_janoub',31.2200,32.2780,7500,0.03,5200,5,5,5,5),
  -- حي المثلث الجديد
  ('a_amal','الأمل','d_muthalath',31.2500,32.2700,10500,0.05,7200,6,7,6,6),
  ('a_sarw','السرو','d_muthalath',31.2520,32.2720,11000,0.05,7500,7,7,7,7),
  ('a_stad','الاستاد','d_muthalath',31.2540,32.2740,11500,0.05,7800,7,7,7,7),
  -- حي بورفؤاد أول
  ('a_cab','الكاب','d_pf1',31.2480,32.3250,13500,0.06,9200,8,8,8,7),
  ('a_villas','فيلات الضباط','d_pf1',31.2500,32.3280,21000,0.08,14500,9,9,8,7),
  ('a_pf_old','بورفؤاد القديمة','d_pf1',31.2460,32.3220,14000,0.05,9500,7,8,7,7),
  ('a_mina','مينا الترسانة','d_pf1',31.2440,32.3200,12500,0.04,8500,7,7,7,6),
  -- حي بورفؤاد ثاني
  ('a_pf_new','بورفؤاد الجديدة','d_pf2',31.2400,32.3350,12000,0.06,8200,7,7,7,6),
  ('a_eskan_new','الإسكان الجديد','d_pf2',31.2380,32.3320,11000,0.05,7500,6,7,6,6),
  ('a_tawsiat','التوسعات الشرقية','d_pf2',31.2420,32.3400,10500,0.05,7200,6,7,6,6);
