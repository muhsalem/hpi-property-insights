/**
 * PropertyScore calibration — fit factor weights via OLS regression
 * on historical (factor_ratings → log price/sqm) data.
 *
 * Replaces fixed weights (30/15/15/...) with empirically-derived ones.
 */
export interface CalibrationSample {
  factors: Record<string, number>; // factor key -> rating pct (0-100)
  pricePerSqm: number;
}

export interface CalibrationResult {
  weights: Record<string, number>;  // normalized weights summing to 100
  r2: number;                       // goodness of fit
  intercept: number;
  n: number;
}

/** Solve OLS via normal equations: β = (XᵀX)⁻¹ Xᵀy */
function solveOls(X: number[][], y: number[]): number[] | null {
  const n = X.length;
  const k = X[0].length;
  // Build XtX (k x k) and Xty (k)
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty: number[] = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  // Gauss-Jordan inverse
  const M: number[][] = XtX.map((row, i) => [...row, ...Array(k).fill(0).map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < k; i++) {
    let pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      let swap = -1;
      for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > 1e-12) { swap = r; break; }
      if (swap < 0) return null;
      [M[i], M[swap]] = [M[swap], M[i]];
      pivot = M[i][i];
    }
    for (let j = 0; j < 2 * k; j++) M[i][j] /= pivot;
    for (let r = 0; r < k; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let j = 0; j < 2 * k; j++) M[r][j] -= f * M[i][j];
    }
  }
  const inv = M.map((row) => row.slice(k));
  const beta = Array(k).fill(0);
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) beta[i] += inv[i][j] * Xty[j];
  return beta;
}

export function calibrateWeights(
  samples: CalibrationSample[],
  factorKeys: string[],
): CalibrationResult | null {
  if (samples.length < factorKeys.length + 2) return null;
  // Use log(price) to linearize
  const y = samples.map((s) => Math.log(Math.max(1, s.pricePerSqm)));
  // Design matrix: intercept + factor ratings
  const X = samples.map((s) => [1, ...factorKeys.map((k) => s.factors[k] ?? 0)]);
  const beta = solveOls(X, y);
  if (!beta) return null;

  const intercept = beta[0];
  const rawCoeffs = beta.slice(1);
  // Convert coefficients to positive weights (use abs, since negative may appear)
  const absCoeffs = rawCoeffs.map((c) => Math.max(0, c));
  const sum = absCoeffs.reduce((s, v) => s + v, 0) || 1;
  const weights: Record<string, number> = {};
  factorKeys.forEach((k, i) => {
    weights[k] = Math.round((absCoeffs[i] / sum) * 1000) / 10; // % with 1 decimal
  });

  // R²
  const yMean = y.reduce((s, v) => s + v, 0) / y.length;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < y.length; i++) {
    const yhat = X[i].reduce((s, x, j) => s + x * beta[j], 0);
    ssRes += (y[i] - yhat) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { weights, r2, intercept, n: samples.length };
}
