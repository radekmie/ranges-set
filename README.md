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
import { difference, expand, intersection, normalize, subset, union } from 'ranges-set';

difference('1-4', '2-3'); // '1,4'
expand('1-3,5-7'); // ['1', '2', '3', '5', '6', '7']
intersection('1-10', '5-10'); // '5-10'
normalize('1,2,3,5,6-8'); // '1-3,5-8'
subset('1-3', '1-2'); // true
union('1-60,40-100'); // '1-100'
```

## API

```ts
function difference(textA: string, textB: string): string;
function expand(text: string): string[];
function intersection(textA: string, textB: string): string;
function normalize(text: string): string;
function subset(textA: string, textB: string): boolean;
function union(textA: string, textB: string): string;
```
