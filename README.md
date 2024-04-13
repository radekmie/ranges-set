# ranges-set

> Set operations on human-friendly ranges.

## Features

* **Easy** for the users to understand and developers to use
* **Fast** even for huge ranges
* **Small** bundle footprint (less than 1Kb gzipped)

## Motivation

A naive implementation of this package would always expand the sets first and then operate on arrays or native `Set` objects. While this approach works, one can hang your app with a simple input of `1-1000000000`.

That is why `ranges-set` operates on actual _ranges_, resulting in performance scalable with the number of ranges (i.e., the number of commas). **Caution**: it is not the case for `expand`, as it has to return all elements!

## Usage

```ts
import { difference, equal, expand, intersection, normalize, subset, union } from 'ranges-set';

difference('1-4', '2-3'); // '1,4'
equal('1-3', '1-2'); // false
expand('1-3,5-7'); // ['1', '2', '3', '5', '6', '7']
intersection('1-10', '5-10'); // '5-10'
normalize('1,2,3,5,6-8'); // '1-3,5-8'
subset('1-3', '1-2'); // true
union('1-60,40-100'); // '1-100'
```

## API

```ts
function difference(textA: string, textB: string): string;
function equal(textA: string, textB: string): boolean;
function expand(text: string): string[];
function intersection(textA: string, textB: string): string;
function normalize(text: string): string;
function subset(textA: string, textB: string): boolean;
function union(textA: string, textB: string): string;
```

On top of that, all internal functions are exported with a prefix (`_`). It allows you to achieve the best performance, as you can operate on the internal representation of the parsed objects instead of strings.

```ts
function _compare(reprA: Repr, reprB: Repr): number;
function _createLiteral(text: string): Repr;
function _createRange(min: number, max: number): Repr;
function _differenceReprs(reprsA: Repr[], reprsB: Repr[]): Repr[];
function _equalReprs(reprsA: Repr[], reprsB: Repr[]): boolean;
function _expandReprs(reprs: Repr[]): string[];
function _intersectionRepr(reprA: Repr, reprB: Repr): Repr | null;
function _intersectionReprs(reprsA: Repr[], reprsB: Repr[]): Repr[];
function _parse(text: string): Repr[];
function _parseOne(text: string): Repr;
function _serialize(reprs: Repr[]): string;
function _serializeOne(repr: Repr): string;
function _subsetReprs(reprsA: Repr[], reprsB: Repr[]): boolean;
function _unionRepr(reprA: Repr, reprB: Repr): boolean;
function _unionReprs(reprs: Repr[], repr: Repr): void;
function _unionReprsAt(reprs: Repr[], repr: Repr, index: number): boolean;
```
