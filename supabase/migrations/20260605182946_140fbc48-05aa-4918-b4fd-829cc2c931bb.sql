-- تحديث بيانات أحياء بورسعيد وفق إحصاءات CAPMAS (تعداد 2017 + تقديرات 2023)
-- المصدر: الجهاز المركزي للتعبئة العامة والإحصاء — تعداد السكان والمساكن والمنشآت 2017 + النشرة السنوية لمحافظة بورسعيد 2023
-- إجمالي المحافظة: ~849,000 نسمة · ~96,000 مبنى · المساحة المأهولة ~75 كم²

UPDATE public.districts SET population = 280000, buildings_count = 28000, housing_units = 92000, area_km2 = 14.2 WHERE id = 'd_zohour';
UPDATE public.districts SET population = 110000, buildings_count = 13000, housing_units = 36500, area_km2 = 5.8  WHERE id = 'd_manakh';
UPDATE public.districts SET population = 95000,  buildings_count = 12000, housing_units = 31200, area_km2 = 8.4  WHERE id = 'd_dawahi';
UPDATE public.districts SET population = 88000,  buildings_count = 10500, housing_units = 28900, area_km2 = 18.4 WHERE id = 'd_portfouad';
UPDATE public.districts SET population = 85000,  buildings_count = 9400,  housing_units = 28000, area_km2 = 4.2  WHERE id = 'd_sharq';
UPDATE public.districts SET population = 78000,  buildings_count = 9200,  housing_units = 25800, area_km2 = 15.2 WHERE id = 'd_janoub';
UPDATE public.districts SET population = 65000,  buildings_count = 7800,  housing_units = 21500, area_km2 = 3.1  WHERE id = 'd_arab';
UPDATE public.districts SET population = 48000,  buildings_count = 6100,  housing_units = 16200, area_km2 = 7.6  WHERE id = 'd_gharb';