// Thin wrapper over mathjs Fractions to keep our code terse and swappable if needed.
// Usage:
//   import { Fr, add, sub, mul, div, lt, lte, toNumber } from './fraction';
//   const a = Fr('1/3'); const b = Fr(2);
//   const c = add(a, b); // Fraction
//   toNumber(c) // -> 2.333...

import { fraction as mFrac, add as mAdd, subtract as mSub, multiply as mMul, divide as mDiv, compare as mCompare } from 'mathjs';

export function Fr(x, d) {
  // Accept (n, d) or single value including 'a/b' strings
  if (typeof x === 'number' && typeof d === 'number') return mFrac(x, d);
  return mFrac(x);
}

export const add = (a, b) => mAdd(a, b);
export const sub = (a, b) => mSub(a, b);
export const mul = (a, b) => mMul(a, b);
export const div = (a, b) => mDiv(a, b);
export const lt = (a, b) => mCompare(a, b) < 0;
export const lte = (a, b) => mCompare(a, b) <= 0;
export const eq = (a, b) => mCompare(a, b) === 0;
export const gt = (a, b) => mCompare(a, b) > 0;
export const gte = (a, b) => mCompare(a, b) >= 0;
export const toNumber = (a) => Number(a.valueOf());

export function clamp(a, min, max) {
  if (lt(a, min)) return min;
  if (gt(a, max)) return max;
  return a;
}

export function from(x) {
  return Fr(x);
}
