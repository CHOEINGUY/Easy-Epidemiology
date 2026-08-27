function validateCellCount(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function buildLogFactorials(max: number): number[] {
  const values = new Array<number>(max + 1);
  values[0] = 0;

  for (let i = 1; i <= max; i++) {
    values[i] = values[i - 1] + Math.log(i);
  }

  return values;
}

function logCombination(n: number, k: number, logFactorials: number[]): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return logFactorials[n] - logFactorials[k] - logFactorials[n - k];
}

function logSumExp(values: number[]): number {
  if (values.length === 0) return Number.NEGATIVE_INFINITY;

  const maxValue = Math.max(...values);
  let scaledSum = 0;

  for (const value of values) {
    scaledSum += Math.exp(value - maxValue);
  }

  return maxValue + Math.log(scaledSum);
}

/**
 * Two-sided Fisher's exact test for a 2x2 contingency table.
 *
 * The implementation works in log space so it remains stable for tables
 * whose factorial terms would overflow JavaScript's Number range.
 */
export function fisherExactTwoSided(a: number, b: number, c: number, d: number): number {
  validateCellCount(a, 'a');
  validateCellCount(b, 'b');
  validateCellCount(c, 'c');
  validateCellCount(d, 'd');

  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;
  const total = row1 + row2;

  if (total === 0) return 1;

  const logFactorials = buildLogFactorials(total);
  const denominator = logCombination(total, row1, logFactorials);
  const lower = Math.max(0, row1 - col2);
  const upper = Math.min(row1, col1);

  const tableLogProbability = (x: number): number => {
    return logCombination(col1, x, logFactorials) +
      logCombination(col2, row1 - x, logFactorials) -
      denominator;
  };

  const observedLogProbability = tableLogProbability(a);
  const comparisonTolerance = Math.log1p(1e-12);
  const includedLogProbabilities: number[] = [];

  for (let x = lower; x <= upper; x++) {
    const logProbability = tableLogProbability(x);
    if (logProbability <= observedLogProbability + comparisonTolerance) {
      includedLogProbabilities.push(logProbability);
    }
  }

  const logPValue = logSumExp(includedLogProbabilities);
  const pValue = Math.exp(logPValue);

  return Math.min(1, Math.max(0, pValue));
}
