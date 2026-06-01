export type MaterialItem = {
  id: string;
  name: string;
  category: "خامات أساسية" | "تكسيات وأرضيات" | "عوازل ودهانات" | "طاقة شمسية" | "إنارة وتشطيب";
  unit: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  change: number;
};

export const MATERIALS_DATA: MaterialItem[] = [
  // خامات أساسية
  { id: "cement_42", name: "أسمنت بورتلاندي بوزولاني 42.5", category: "خامات أساسية", unit: "طن", jan: 3829, feb: 3825, mar: 3831, apr: 3831, may: 3651, change: -4.65 },
  { id: "cement_resist", name: "أسمنت بوزولاني مقاوم", category: "خامات أساسية", unit: "طن", jan: 3845, feb: 3840, mar: 3853, apr: 3853, may: 3680, change: -4.29 },
  { id: "cement_finish", name: "أسمنت بوزولاني للتشطيبات", category: "خامات أساسية", unit: "طن", jan: 2927, feb: 2933, mar: 2933, apr: 2933, may: 2560, change: -12.55 },
  { id: "cement_eco", name: "أسمنت ECO Plant 50%", category: "خامات أساسية", unit: "طن", jan: 4219, feb: 4215, mar: 4187, apr: 4232, may: 4171, change: -1.14 },
  { id: "clay_brick", name: "طوب طفلي هولو 20×26×10", category: "خامات أساسية", unit: "طن", jan: 9000, feb: 9000, mar: 9000, apr: 9616, may: 10289, change: 14.32 },
  // تكسيات وأرضيات
  { id: "wpc_floor", name: "خشب بلاستيكي WPC أرضيات", category: "تكسيات وأرضيات", unit: "م²", jan: 4235, feb: 4235, mar: 4023, apr: 4828, may: 4828, change: 14.0 },
  { id: "wpc_clad", name: "خشب بلاستيكي WPC تجليد", category: "تكسيات وأرضيات", unit: "م²", jan: 3025, feb: 3025, mar: 2874, apr: 3449, may: 3449, change: 14.02 },
  { id: "pvc_wood", name: "بديل الخشب PVC لوح 20سم", category: "تكسيات وأرضيات", unit: "لوح", jan: 248, feb: 248, mar: 318, apr: 318, may: 298, change: 20.16 },
  { id: "slice_122", name: "ساليس ستون 122×61 سم", category: "تكسيات وأرضيات", unit: "م²", jan: 1618, feb: 1618, mar: 1618, apr: 1618, may: 1618, change: 0 },
  { id: "slice_210", name: "ساليس ستون 210×105 سم", category: "تكسيات وأرضيات", unit: "م²", jan: 2130, feb: 2130, mar: 2130, apr: 2130, may: 2130, change: 0 },
  { id: "pvc_marble", name: "بديل الرخام PVC بطبقة حماية", category: "تكسيات وأرضيات", unit: "م²", jan: 741, feb: 741, mar: 866, apr: 866, may: 816, change: 10.12 },
  { id: "pvc_chip", name: "بديل الشيبورد PVC لوح 1.22م", category: "تكسيات وأرضيات", unit: "لوح", jan: 1033, feb: 1033, mar: 1358, apr: 1358, may: 1258, change: 21.78 },
  { id: "stone_alt", name: "حجر صناعي خفيف داخلي 120×60", category: "تكسيات وأرضيات", unit: "لوح", jan: 712.5, feb: 712.5, mar: 712.5, apr: 712.5, may: 712.5, change: 0 },
  // عوازل ودهانات
  { id: "nano_ins", name: "مركبات أسمنتية نانو عازل", category: "عوازل ودهانات", unit: "كجم", jan: 31, feb: 31, mar: 33, apr: 33, may: 33, change: 6.45 },
  { id: "space_paint", name: "دهان تقنية أبحاث الفضاء", category: "عوازل ودهانات", unit: "كجم", jan: 91, feb: 91, mar: 97, apr: 107, may: 107, change: 17.58 },
  { id: "rubber_paint", name: "دهان مطاطي مقاوم للماء", category: "عوازل ودهانات", unit: "كجم", jan: 136, feb: 136, mar: 146, apr: 161, may: 153, change: 12.5 },
  { id: "nano_paint", name: "دهان مطاطي نانو مقاوم للماء", category: "عوازل ودهانات", unit: "كجم", jan: 194, feb: 194, mar: 213, apr: 234, may: 234, change: 20.62 },
  { id: "powder_4in1", name: "مسحوق طبيعي متعدد الأغراض", category: "عوازل ودهانات", unit: "كجم", jan: 43, feb: 43, mar: 45, apr: 45, may: 45, change: 4.65 },
  { id: "mineral_paint", name: "مواد رابطة معدنية - دهان", category: "عوازل ودهانات", unit: "كجم", jan: 47, feb: 47, mar: 50, apr: 55, may: 55, change: 17.02 },
  { id: "mineral_plaster", name: "مواد رابطة معدنية - بياض", category: "عوازل ودهانات", unit: "كجم", jan: 34, feb: 34, mar: 36, apr: 40, may: 40, change: 17.65 },
  { id: "acrylic_filler", name: "طلاء أكريلي مالئ شروخ", category: "عوازل ودهانات", unit: "كجم", jan: 140, feb: 140, mar: 140, apr: 150, may: 150, change: 7.14 },
  { id: "acrylic_primer", name: "طلاء أكريلي برايمر", category: "عوازل ودهانات", unit: "كجم", jan: 73, feb: 73, mar: 73, apr: 79, may: 79, change: 8.22 },
  // طاقة شمسية
  { id: "trina_450", name: "ألواح ترينا سولار 450 وات", category: "طاقة شمسية", unit: "وات", jan: 7.4, feb: 7.75, mar: 8.9, apr: 9.15, may: 9.1, change: 22.97 },
  { id: "trina_610", name: "ألواح ترينا سولار 610 وات", category: "طاقة شمسية", unit: "وات", jan: 6.75, feb: 7.5, mar: 8.4, apr: 9.15, may: 9.1, change: 34.81 },
  { id: "jinko_475", name: "ألواح جنكو 475 وات", category: "طاقة شمسية", unit: "وات", jan: 8, feb: 7.55, mar: 8.9, apr: 9.3, may: 9.1, change: 13.75 },
  { id: "bat_100", name: "بطاريات نيو ماكس 100 أمبير", category: "طاقة شمسية", unit: "عدد", jan: 11650, feb: 11650, mar: 11650, apr: 12233, may: 12233, change: 5.0 },
  { id: "bat_200", name: "بطاريات نيو ماكس 200 أمبير", category: "طاقة شمسية", unit: "عدد", jan: 17800, feb: 17800, mar: 17800, apr: 18690, may: 18690, change: 5.0 },
  { id: "inv_5kva", name: "عاكس Luminous 5KVA", category: "طاقة شمسية", unit: "عدد", jan: 27500, feb: 27500, mar: 28875, apr: 28875, may: 28875, change: 5.0 },
  { id: "heater_200", name: "سخانات شمسية 200 لتر Eurostar", category: "طاقة شمسية", unit: "عدد", jan: 55800, feb: 55800, mar: 55800, apr: 55800, may: 55800, change: 0 },
  // إنارة وتشطيب
  { id: "glass_brick_w", name: "طوب زجاجي أبيض 19×19×8", category: "إنارة وتشطيب", unit: "عدد", jan: 140.5, feb: 154, mar: 162, apr: 162, may: 162, change: 15.3 },
  { id: "glass_brick_c", name: "طوب زجاجي ملون", category: "إنارة وتشطيب", unit: "عدد", jan: 211, feb: 217, mar: 225, apr: 225, may: 225, change: 6.64 },
  { id: "polycarb", name: "ألواح بوليكربونيت كريستال 2.5مم", category: "إنارة وتشطيب", unit: "لوح", jan: 5871, feb: 5871, mar: 7068, apr: 8436, may: 9520, change: 62.16 },
  { id: "spot_6w", name: "Spot Lamp 6W 2700 Lumen", category: "إنارة وتشطيب", unit: "عدد", jan: 44.5, feb: 44.5, mar: 44.5, apr: 44.5, may: 44.5, change: 0 },
  { id: "panel_48w", name: "LED Panel 48W 5664 Lumen", category: "إنارة وتشطيب", unit: "عدد", jan: 855, feb: 855, mar: 855, apr: 855, may: 855, change: 0 },
];

export const MATERIAL_CATEGORIES = [
  "الكل",
  "خامات أساسية",
  "تكسيات وأرضيات",
  "عوازل ودهانات",
  "طاقة شمسية",
  "إنارة وتشطيب",
] as const;
