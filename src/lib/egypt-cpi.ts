/**
 * Egypt CPI + USD/EGP exchange rate annual averages
 * Source: CAPMAS + CBE (approximate annual averages)
 * Used to anchor PriceHistoryChart on real macro data
 */
export interface MacroPoint {
  year: number;
  cpi: number;        // CPI index (2010 = 100)
  usdEgp: number;     // annual avg USD/EGP
  cpiYoY: number;     // YoY inflation %
}

// Approximate annual averages (CAPMAS Consumer Price Index, all-items urban)
// rebased so 2010 = 100, with USD/EGP annual averages
export const EGYPT_MACRO: MacroPoint[] = [
  { year: 2000, cpi: 50.0,  usdEgp: 3.47,  cpiYoY: 2.7 },
  { year: 2001, cpi: 51.4,  usdEgp: 3.97,  cpiYoY: 2.3 },
  { year: 2002, cpi: 52.8,  usdEgp: 4.50,  cpiYoY: 2.7 },
  { year: 2003, cpi: 54.4,  usdEgp: 5.85,  cpiYoY: 4.5 },
  { year: 2004, cpi: 57.4,  usdEgp: 6.20,  cpiYoY: 11.3 },
  { year: 2005, cpi: 60.0,  usdEgp: 5.78,  cpiYoY: 4.9 },
  { year: 2006, cpi: 64.5,  usdEgp: 5.73,  cpiYoY: 7.6 },
  { year: 2007, cpi: 70.7,  usdEgp: 5.64,  cpiYoY: 9.5 },
  { year: 2008, cpi: 84.3,  usdEgp: 5.43,  cpiYoY: 18.3 },
  { year: 2009, cpi: 93.6,  usdEgp: 5.55,  cpiYoY: 11.8 },
  { year: 2010, cpi: 100.0, usdEgp: 5.62,  cpiYoY: 11.3 },
  { year: 2011, cpi: 110.1, usdEgp: 5.93,  cpiYoY: 10.1 },
  { year: 2012, cpi: 117.6, usdEgp: 6.06,  cpiYoY: 7.1 },
  { year: 2013, cpi: 129.0, usdEgp: 6.87,  cpiYoY: 9.5 },
  { year: 2014, cpi: 142.0, usdEgp: 7.08,  cpiYoY: 10.1 },
  { year: 2015, cpi: 156.0, usdEgp: 7.71,  cpiYoY: 10.4 },
  { year: 2016, cpi: 181.4, usdEgp: 10.03, cpiYoY: 13.8 }, // float 1
  { year: 2017, cpi: 235.9, usdEgp: 17.78, cpiYoY: 29.8 },
  { year: 2018, cpi: 261.3, usdEgp: 17.77, cpiYoY: 14.4 },
  { year: 2019, cpi: 282.4, usdEgp: 16.77, cpiYoY: 9.4 },
  { year: 2020, cpi: 296.6, usdEgp: 15.76, cpiYoY: 5.0 },
  { year: 2021, cpi: 312.0, usdEgp: 15.65, cpiYoY: 5.2 },
  { year: 2022, cpi: 338.8, usdEgp: 19.16, cpiYoY: 8.5 }, // float 2
  { year: 2023, cpi: 437.4, usdEgp: 30.65, cpiYoY: 33.9 },
  { year: 2024, cpi: 561.2, usdEgp: 47.85, cpiYoY: 28.3 }, // float 3 (Mar 2024)
  { year: 2025, cpi: 633.1, usdEgp: 50.10, cpiYoY: 12.8 },
  { year: 2026, cpi: 690.0, usdEgp: 50.50, cpiYoY: 9.0 },
];

export function getMacro(year: number): MacroPoint | undefined {
  return EGYPT_MACRO.find((m) => m.year === year);
}

/** Convert nominal EGP between two years using CPI */
export function inflateEgp(amount: number, fromYear: number, toYear: number): number {
  const a = getMacro(fromYear)?.cpi;
  const b = getMacro(toYear)?.cpi;
  if (!a || !b) return amount;
  return amount * (b / a);
}

/** Real-estate-specific multiplier: properties typically track CPI × 0.75
 *  (housing component grows slower than headline CPI in Egypt) */
export function realEstateGrowth(fromYear: number, toYear: number): number {
  const a = getMacro(fromYear)?.cpi;
  const b = getMacro(toYear)?.cpi;
  if (!a || !b) return 1;
  const cpiRatio = b / a;
  // dampen by 0.85 (real estate underperforms headline CPI long-term in EG)
  return Math.pow(cpiRatio, 0.85);
}
