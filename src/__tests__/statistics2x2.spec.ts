import { fisherExactTwoSided } from '../utils/statistics2x2';

function expectRelativeClose(actual: number, expected: number, tolerance = 1e-10): void {
  if (expected === 0) {
    expect(actual).toBe(0);
    return;
  }

  expect(Math.abs(actual / expected - 1)).toBeLessThanOrEqual(tolerance);
}

describe('fisherExactTwoSided', () => {
  test.each([
    [1, 9, 11, 3, 0.0027594561852200836],
    [8, 2, 1, 5, 0.034965034965034975],
    [10, 5, 3, 12, 0.025327687033676133],
    [100, 200, 150, 250, 0.26532192481235267],
    [500, 400, 300, 600, 2.5272458336208166e-21],
    [0, 10, 5, 15, 0.14003620900172625],
    [170, 1, 1, 170, 1.5141503775383273e-97]
  ])(
    'matches a trusted reference for table [%i, %i; %i, %i]',
    (a, b, c, d, expected) => {
      expectRelativeClose(fisherExactTwoSided(a, b, c, d), expected);
    }
  );

  test('returns 1 for an empty table', () => {
    expect(fisherExactTwoSided(0, 0, 0, 0)).toBe(1);
  });

  test.each([
    [-1, 0, 0, 0],
    [1.5, 0, 0, 0],
    [Number.NaN, 0, 0, 0],
    [Number.POSITIVE_INFINITY, 0, 0, 0]
  ])('rejects invalid cell counts', (a, b, c, d) => {
    expect(() => fisherExactTwoSided(a, b, c, d)).toThrow(RangeError);
  });
});
