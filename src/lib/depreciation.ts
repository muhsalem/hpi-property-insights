/**
 * Multi-component depreciation (IVS 410 + Marshall & Swift methodology)
 * Decomposes building into structural / envelope / finishes / MEP / fit-out
 * with different useful lives and condition multipliers.
 */
export interface Component {
  key: string;
  label: string;
  share: number;       // % of total replacement cost
  usefulLife: number;  // years
}

export const BUILDING_COMPONENTS: Component[] = [
  { key: 'structure',  label: 'الهيكل الإنشائي (خرسانة + حديد)', share: 0.35, usefulLife: 80 },
  { key: 'envelope',   label: 'الواجهات والعزل',                  share: 0.15, usefulLife: 40 },
  { key: 'finishes',   label: 'التشطيبات الداخلية',                share: 0.20, usefulLife: 20 },
  { key: 'mep',        label: 'الكهرباء والسباكة (MEP)',           share: 0.18, usefulLife: 25 },
  { key: 'fitout',     label: 'التجهيزات والمصاعد',                share: 0.12, usefulLife: 15 },
];

export type Condition = 'excellent' | 'good' | 'fair' | 'poor';

const CONDITION_MULT: Record<Condition, number> = {
  excellent: 0.5,  // effective age = 50% of chronological
  good: 0.8,
  fair: 1.0,
  poor: 1.3,
};

export interface DepreciationResult {
  componentKey: string;
  label: string;
  share: number;
  effectiveAge: number;
  usefulLife: number;
  depreciationPct: number; // 0..1
  contributionPct: number; // weighted contribution to total depreciation
}

export function computeDepreciation(
  buildingAge: number,
  condition: Condition,
  componentOverrides?: Partial<Record<string, Condition>>,
): { perComponent: DepreciationResult[]; totalDepreciationPct: number } {
  const perComponent = BUILDING_COMPONENTS.map((c) => {
    const cond = componentOverrides?.[c.key] ?? condition;
    const effAge = Math.min(buildingAge * CONDITION_MULT[cond], c.usefulLife);
    // Straight-line with 10% residual floor
    const depr = Math.min(0.9, effAge / c.usefulLife);
    return {
      componentKey: c.key,
      label: c.label,
      share: c.share,
      effectiveAge: effAge,
      usefulLife: c.usefulLife,
      depreciationPct: depr,
      contributionPct: depr * c.share,
    } as DepreciationResult;
  });
  const total = perComponent.reduce((s, r) => s + r.contributionPct, 0);
  return { perComponent, totalDepreciationPct: total };
}
