import test from 'ava';

import {
  difference,
  equal,
  expand,
  intersection,
  normalize,
  subset,
  union,
} from '.';

function test1<A, B>(fn: (a: A) => B, tests: [A, B][]) {
  for (const [a, b] of tests) {
    test(`${fn.name}('${String(a)}') = '${String(b)}'`, t => {
      t.deepEqual(fn(a), b);
    });
  }
}

function test2<A, B, C>(fn: (a: A, b: B) => C, tests: [A, B, C][]) {
  for (const [a, b, c] of tests) {
    test(`${fn.name}('${String(a)}', '${String(b)}') = '${String(c)}'`, t => {
      t.deepEqual(fn(a, b), c);
    });
  }
}

test2(difference, [
  ['1', '1', ''],
  ['1', '1-2', ''],
  ['1', '2', '1'],
  ['1', '2-100', '1'],
  ['1', '3', '1'],
  ['1,5', '1-5', ''],
  ['1-2', '1', '2'],
  ['1-2', '1-2', ''],
  ['1-2', '2', '1'],
  ['1-2,4-5', '1-5', ''],
  ['1-3', '2-4', '1'],
  ['1-5', '1,5', '2-4'],
  ['1-5', '1-2,4-5', '3'],
  ['1-6', '1,3,6', '2,4-5'],
  ['1-6', '1,4', '2-3,5-6'],
  ['1-6', '1,6', '2-5'],
  ['1-6', '2,4', '1,3,5-6'],
  ['1-6', '2-5', '1,6'],
  ['2', '1', '2'],
  ['2-100', '1', '2-100'],
  ['2-4', '1-3', '4'],
  ['3', '1', '3'],
  ['a', 'a', ''],
  ['a', 'b', 'a'],
  ['a,1', 'b,1', 'a'],
  ['a,1', 'b,2', 'a,1'],
  ['b', 'a', 'b'],
  ['b,1', 'a,1', 'b'],
  ['b,2', 'a,1', 'b,2'],
]);

test2(equal, [
  ['1', '1', true],
  ['1', '1-2', false],
  ['1', '2', false],
  ['1', '2-100', false],
  ['1', '3', false],
  ['1,5', '1-5', false],
  ['1-2', '1', false],
  ['1-2', '1-2', true],
  ['1-2', '2', false],
  ['1-2,3,4-5', '1-5', true],
  ['1-2,4-5', '1-5', false],
  ['1-3', '2-4', false],
  ['1-5', '1,5', false],
  ['1-5', '1-2,4-5', false],
  ['1-6', '1,3,6', false],
  ['1-6', '1,4', false],
  ['1-6', '1,6', false],
  ['1-6', '2,4', false],
  ['1-6', '2-5', false],
  ['2', '1', false],
  ['2-100', '1', false],
  ['2-4', '1-3', false],
  ['3', '1', false],
  ['a', 'a', true],
  ['a', 'b', false],
  ['a,1', 'b,1', false],
  ['a,1', 'b,2', false],
  ['b', 'a', false],
  ['b,1', 'a,1', false],
  ['b,2', 'a,1', false],
]);

test1(expand, [
  [',', []],
  [',,', []],
  [',1', ['1']],
  [',a', ['a']],
  ['0', ['0']],
  ['0-2', ['0', '1', '2']],
  ['00-02', ['00-02']],
  ['1 ,1', ['1']],
  ['1 -2', ['1', '2']],
  ['1 1', ['1 1']],
  ['1', ['1']],
  ['1, 1', ['1']],
  ['1,', ['1']],
  ['1,1', ['1']],
  ['1,1,1', ['1']],
  ['1,2', ['1', '2']],
  ['1,2,1', ['1', '2']],
  ['1,2,3', ['1', '2', '3']],
  ['1,2,3,4', ['1', '2', '3', '4']],
  ['1,2,3-4', ['1', '2', '3', '4']],
  ['1,2-3', ['1', '2', '3']],
  ['1,2-3,4', ['1', '2', '3', '4']],
  ['1- 2', ['1', '2']],
  ['1-2', ['1', '2']],
  ['1-2,3', ['1', '2', '3']],
  ['1-2,3,4', ['1', '2', '3', '4']],
  ['1-2,3-4', ['1', '2', '3', '4']],
  ['1-3', ['1', '2', '3']],
  ['1-3,4', ['1', '2', '3', '4']],
  ['2,1,2', ['1', '2']],
  ['3,2,1', ['1', '2', '3']],
  ['a', ['a']],
  ['a,', ['a']],
  ['a,a', ['a']],
  ['a,b', ['a', 'b']],
  ['b,a', ['a', 'b']],
  ['c,1-3', ['c', '1', '2', '3']],
  ['c,1-3,d', ['c', 'd', '1', '2', '3']],
]);

test1(normalize, [
  [',', ''],
  [',,', ''],
  [',1', '1'],
  [',a', 'a'],
  ['0', '0'],
  ['0-2', '0-2'],
  ['00-02', '00-02'],
  ['1 ,1', '1'],
  ['1 -2', '1-2'],
  ['1 1', '1 1'],
  ['1', '1'],
  ['1, 1', '1'],
  ['1,', '1'],
  ['1,1', '1'],
  ['1,1,1', '1'],
  ['1,2', '1-2'],
  ['1,2,1', '1-2'],
  ['1,2,3', '1-3'],
  ['1,2,3,4', '1-4'],
  ['1,2,3-4', '1-4'],
  ['1,2-3', '1-3'],
  ['1,2-3,4', '1-4'],
  ['1- 2', '1-2'],
  ['1-2', '1-2'],
  ['1-2,3', '1-3'],
  ['1-2,3,4', '1-4'],
  ['1-2,3-4', '1-4'],
  ['1-3', '1-3'],
  ['1-3,4', '1-4'],
  ['2,1,2', '1-2'],
  ['3,2,1', '1-3'],
  ['a', 'a'],
  ['a,', 'a'],
  ['a,a', 'a'],
  ['a,b', 'a,b'],
  ['b,a', 'a,b'],
  ['c,1-3', 'c,1-3'],
  ['c,1-3,d', 'c,d,1-3'],
]);

test2(subset, [
  ['', '', true],
  ['', '1', false],
  ['', 'a', false],
  ['1', '', true],
  ['1', '1', true],
  ['1', 'a', false],
  ['1-3', '0', false],
  ['1-3', '0-1', false],
  ['1-3', '1', true],
  ['1-3', '1-2', true],
  ['1-3', '1-3', true],
  ['1-3', '2', true],
  ['1-3', '2-3', true],
  ['1-3', '3', true],
  ['1-3', '3-4', false],
  ['1-3', '4', false],
  ['1-3,2-5', '0', false],
  ['1-3,2-5', '1-5', true],
  ['1-3,2-5', '6', false],
  ['1-3,a,2-5', '1-5,a', true],
  ['1-3,a,2-5', '1-5,b', false],
  ['a', '', true],
  ['a', '1', false],
  ['a', 'a', true],
]);

test2(intersection, [
  ['1', '1', '1'],
  ['1', '1-2', '1'],
  ['1', '2', ''],
  ['1', '2-100', ''],
  ['1', '3', ''],
  ['1,5', '1-5', '1,5'],
  ['1-2', '1', '1'],
  ['1-2', '1-2', '1-2'],
  ['1-2', '2', '2'],
  ['1-2,4-5', '1-5', '1-2,4-5'],
  ['1-3', '2-4', '2-3'],
  ['1-5', '1,5', '1,5'],
  ['1-5', '1-2,4-5', '1-2,4-5'],
  ['2', '1', ''],
  ['2-100', '1', ''],
  ['2-4', '1-3', '2-3'],
  ['3', '1', ''],
  ['a', 'a', 'a'],
  ['a', 'b', ''],
  ['a,1', 'b,1', '1'],
  ['a,1', 'b,2', ''],
  ['b', 'a', ''],
  ['b,1', 'a,1', '1'],
  ['b,2', 'a,1', ''],
]);

test2(union, [
  ['1', '1', '1'],
  ['1', '1-2', '1-2'],
  ['1', '2', '1-2'],
  ['1', '2-100', '1-100'],
  ['1', '3', '1,3'],
  ['1,5', '1-5', '1-5'],
  ['1-2', '1', '1-2'],
  ['1-2', '1-2', '1-2'],
  ['1-2', '2', '1-2'],
  ['1-2,4-5', '1-5', '1-5'],
  ['1-3', '2-4', '1-4'],
  ['1-5', '1,5', '1-5'],
  ['1-5', '1-2,4-5', '1-5'],
  ['2', '1', '1-2'],
  ['2-100', '1', '1-100'],
  ['3', '1', '1,3'],
  ['a', 'a', 'a'],
  ['a', 'b', 'a,b'],
  ['a,1', 'b,1', 'a,b,1'],
  ['a,1', 'b,2', 'a,b,1-2'],
  ['b', 'a', 'a,b'],
  ['b,1', 'a,1', 'a,b,1'],
  ['b,2', 'a,1', 'a,b,1-2'],
]);
