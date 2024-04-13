const enum Kind {
  Literal = 0,
  Range = 1,
}

type Repr = ReprLiteral | ReprRange;
type Reprs = Repr[];
type ReprLiteral = { _kind: Kind.Literal; _text: string };
type ReprRange = { _kind: Kind.Range; _min: number; _max: number };

const numberPattern = /^(?:0|[1-9]\d*)$/;
const rangePattern = /^(0|[1-9]\d*)\s*-\s*(0|[1-9]\d*)$/;

function compare(reprA: Repr, reprB: Repr): number {
  if (reprA._kind !== reprB._kind) {
    return reprA._kind - reprB._kind;
  }

  switch (reprA._kind) {
    case Kind.Literal:
      return reprA._text >= (reprB as ReprLiteral)._text
        ? reprA._text > (reprB as ReprLiteral)._text
          ? 1
          : 0
        : -1;
    case Kind.Range:
      return (
        reprA._min - (reprB as ReprRange)._min ||
        reprA._max - (reprB as ReprRange)._max
      );
  }
}

export function difference(textA: string, textB: string): string {
  const reprsA = parse(textA);
  const reprsB = parse(textB);
  const reprs = differenceReprs(reprsA, reprsB);
  return serialize(reprs);
}

// eslint-disable-next-line complexity -- This function IS complex.
function differenceReprs(reprsA: Reprs, reprsB: Reprs): Reprs {
  const reprs: Reprs = [];
  loop: for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    switch (reprA._kind) {
      case Kind.Literal:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB._kind === Kind.Literal && reprB._text === reprA._text) {
            continue loop;
          }
        }

        break;
      case Kind.Range:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB._kind === Kind.Range) {
            if (reprA._min >= reprB._min && reprA._max <= reprB._max) {
              continue loop;
            }

            if (reprA._min <= reprB._min && reprA._max >= reprB._max) {
              if (reprA._max > reprB._max) {
                reprsA.splice(indexA + 1, 0, {
                  _kind: Kind.Range,
                  _min: reprB._max + 1,
                  _max: reprA._max,
                });
              }

              if (reprA._min < reprB._min) {
                reprsA.splice(indexA + 1, 0, {
                  _kind: Kind.Range,
                  _min: reprA._min,
                  _max: reprB._min - 1,
                });
              }

              continue loop;
            }

            if (reprA._min >= reprB._min && reprA._min <= reprB._max) {
              reprA._min = reprB._max + 1;
            } else if (reprA._max >= reprB._min && reprA._max <= reprB._max) {
              reprA._max = reprB._min - 1;
            }
          }
        }

        break;
    }

    reprs.push(reprA);
  }

  return reprs;
}

export function equal(textA: string, textB: string): boolean {
  const reprsA = parse(textA);
  const reprsB = parse(textB);
  return equalReprs(reprsA, reprsB);
}

function equalReprs(reprsA: Reprs, reprsB: Reprs): boolean {
  if (reprsA.length !== reprsB.length) {
    return false;
  }

  for (let index = 0; index < reprsA.length; ++index) {
    if (compare(reprsA[index], reprsB[index])) {
      return false;
    }
  }

  return true;
}

export function expand(text: string): string[] {
  const reprs = parse(text);
  return expandReprs(reprs);
}

function expandReprs(reprs: Reprs): string[] {
  const texts: string[] = [];
  for (let index = 0; index < reprs.length; ++index) {
    const repr = reprs[index];
    switch (repr._kind) {
      case Kind.Literal:
        texts.push(repr._text);
        break;
      case Kind.Range: {
        for (let index = repr._min; index <= repr._max; ++index) {
          texts.push(`${index}`);
        }
        break;
      }
    }
  }

  return texts;
}

export function intersection(textA: string, textB: string): string {
  const reprsA = parse(textA);
  const reprsB = parse(textB);
  const reprs = intersectionReprs(reprsA, reprsB);
  return serialize(reprs);
}

function intersectionRepr(reprA: Repr, reprB: Repr): Repr | null {
  if (reprA._kind !== reprB._kind) {
    return null;
  }

  switch (reprA._kind) {
    case Kind.Literal:
      return reprA._text === (reprB as ReprLiteral)._text ? reprA : null;
    case Kind.Range: {
      const min = Math.max(reprA._min, (reprB as ReprRange)._min);
      const max = Math.min(reprA._max, (reprB as ReprRange)._max);
      return min > max ? null : { _kind: Kind.Range, _min: min, _max: max };
    }
  }
}

function intersectionReprs(reprsA: Reprs, reprsB: Reprs): Reprs {
  const reprs: Reprs = [];
  for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    for (let indexB = 0; indexB < reprsB.length; ++indexB) {
      const reprB = reprsB[indexB];
      const repr = intersectionRepr(reprA, reprB);
      if (repr !== null) {
        reprs.push(repr);
      }
    }
  }

  return reprs;
}

export function normalize(text: string): string {
  const reprs = parse(text);
  return serialize(reprs);
}

function parse(text: string): Reprs {
  const reprs: Reprs = [];
  const chunks = text.split(',');
  for (let index = 0; index < chunks.length; ++index) {
    const chunk = chunks[index].trim();
    if (chunk) {
      const repr = parseOne(chunk);
      unionReprs(reprs, repr);
    }
  }

  return reprs;
}

function parseOne(text: string): Repr {
  if (numberPattern.test(text)) {
    const number = +text;
    return { _kind: Kind.Range, _min: number, _max: number };
  }

  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    const a = +rangeMatch[1];
    const b = +rangeMatch[2];
    return { _kind: Kind.Range, _min: Math.min(a, b), _max: Math.max(a, b) };
  }

  return { _kind: Kind.Literal, _text: text };
}

function serialize(reprs: Reprs): string {
  return reprs.map(serializeOne).join();
}

function serializeOne(repr: Repr): string {
  switch (repr._kind) {
    case Kind.Literal:
      return repr._text;
    case Kind.Range:
      return repr._min === repr._max
        ? `${repr._min}`
        : `${repr._min}-${repr._max}`;
  }
}

export function subset(textA: string, textB: string): boolean {
  const reprsA = parse(textA);
  const reprsB = parse(textB);
  return subsetReprs(reprsA, reprsB);
}

function subsetReprs(reprsA: Reprs, reprsB: Reprs): boolean {
  loop: for (let indexB = 0; indexB < reprsB.length; ++indexB) {
    const reprB = reprsB[indexB];
    switch (reprB._kind) {
      case Kind.Literal:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (reprA._kind === Kind.Literal && reprA._text === reprB._text) {
            continue loop;
          }
        }

        return false;
      case Kind.Range:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (
            reprA._kind === Kind.Range &&
            reprA._min <= reprB._min &&
            reprA._max >= reprB._max
          ) {
            continue loop;
          }
        }

        return false;
    }
  }

  return true;
}

export function union(textA: string, textB: string): string {
  const reprs = parse(`${textA},${textB}`);
  return serialize(reprs);
}

function unionRepr(reprA: Repr, reprB: Repr): boolean {
  if (reprA._kind !== reprB._kind) {
    return false;
  }

  switch (reprA._kind) {
    case Kind.Literal: {
      const same = reprA._text === (reprB as ReprLiteral)._text;
      return same;
    }
    case Kind.Range: {
      const unionable =
        (reprA._min <= (reprB as ReprRange)._max + 1 &&
          reprA._max >= (reprB as ReprRange)._min) ||
        ((reprB as ReprRange)._min <= reprA._max + 1 &&
          (reprB as ReprRange)._max >= reprA._min);

      if (unionable) {
        reprA._min = Math.min(reprA._min, (reprB as ReprRange)._min);
        reprA._max = Math.max(reprA._max, (reprB as ReprRange)._max);
      }

      return unionable;
    }
  }
}

function unionReprs(reprs: Reprs, repr: Repr): void {
  let low = 0;
  let high = reprs.length;
  while (low < high) {
    // eslint-disable-next-line no-bitwise -- This is much faster than Math.floor.
    const middle = (low + high) >>> 1;
    const result = compare(repr, reprs[middle]);
    if (!result) {
      return;
    }

    if (result < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  if (!unionReprsAt(reprs, repr, low) && !unionReprsAt(reprs, repr, low + 1)) {
    reprs.splice(low, 0, repr);
  }
}

function unionReprsAt(reprs: Reprs, repr: Repr, index: number): boolean {
  if (index && index <= reprs.length && unionRepr(reprs[index - 1], repr)) {
    while (index < reprs.length && unionRepr(reprs[index - 1], reprs[index])) {
      reprs.splice(index, 1);
    }

    return true;
  }

  return false;
}
