-- تصحيح التقسيم الإداري لمحافظة بورسعيد وفق البيانات الرسمية
-- المرجع: ويكيبيديا + قرارات محافظة بورسعيد (7 أحياء + مدينة بورفؤاد)

-- 1) إضافة حي الغرب (فُصل عن الزهور 2015)
INSERT INTO public.districts (id, name, city_id, city_name, color)
VALUES ('d_gharb', 'حي الغرب', 'ps', 'بورسعيد', '#9333ea')
ON CONFLICT (id) DO NOTHING;

-- 2) دمج "حي المثلث الجديد" غير الرسمي في حي الضواحي
UPDATE public.areas SET district_id = 'd_dawahi'
 WHERE district_id = 'd_muthalath';

-- نقل "الأمل" تحديداً إلى حي الجنوب (أقرب جغرافياً)
UPDATE public.areas SET district_id = 'd_janoub' WHERE id = 'a_amal';

-- حذف الحي غير الرسمي
DELETE FROM public.districts WHERE id = 'd_muthalath';

-- 3) دمج بورفؤاد أول + ثاني في حي واحد رسمي
INSERT INTO public.districts (id, name, city_id, city_name, color)
VALUES ('d_portfouad', 'حي بورفؤاد', 'pf', 'بورفؤاد', '#0891b2')
ON CONFLICT (id) DO NOTHING;

UPDATE public.areas SET district_id = 'd_portfouad'
 WHERE district_id IN ('d_pf1', 'd_pf2');

DELETE FROM public.districts WHERE id IN ('d_pf1', 'd_pf2');

-- 4) إضافة مناطق نموذجية لحي الغرب (شياخات معروفة)
INSERT INTO public.areas (id, district_id, name, lat, lng, base_price, growth, land_psqm, infra_rating, services_rating, safety_rating, transport_rating, note)
VALUES
 ('a_gharb_ext',  'd_gharb', 'امتداد الزهور الغربي', 31.245, 32.270, 22000, 0.08, 6500, 4, 3, 4, 3, 'منطقة ناشئة — قاعدة بيانات قيد التكوين'),
 ('a_gharb_zir',  'd_gharb', 'الزراعات الغربية',     31.240, 32.260, 18000, 0.07, 5800, 3, 3, 3, 3, 'استخدام سكني/زراعي مختلط'),
 ('a_gharb_taw',  'd_gharb', 'التوسعات الغربية',     31.250, 32.275, 24000, 0.09, 7000, 4, 3, 4, 3, 'توسعات جديدة — مدفوعة بالنمو السكاني')
ON CONFLICT (id) DO NOTHING;

-- 5) إعادة تسمية "حي بورفؤاد القديمة" → "بورفؤاد القديمة" للوضوح
UPDATE public.areas SET name = 'بورفؤاد القديمة' WHERE id = 'a_pf_old';