const enum Kind {
  Literal = 0,
  Range = 1,
}

type IRepr = IReprLiteral | IReprRange;
type IReprs = readonly IRepr[];
type IReprLiteral = Readonly<MReprLiteral>;
type IReprRange = Readonly<MReprRange>;

type MRepr = MReprLiteral | MReprRange;
type MReprs = MRepr[];
type MReprLiteral = { _kind: Kind.Literal; _text: string };
type MReprRange = { _kind: Kind.Range; _min: number; _max: number };

const numberPattern = /^\s*(?:0|[1-9]\d*)\s*$/;
const rangePattern = /^\s*(0|[1-9]\d*)\s*-\s*(0|[1-9]\d*)\s*$/;

function compare(reprA: IRepr, reprB: IRepr): number {
  if (reprA._kind !== reprB._kind) {
    return reprA._kind - reprB._kind;
  }

  switch (reprA._kind) {
    case Kind.Literal:
      return reprA._text >= (reprB as IReprLiteral)._text
        ? reprA._text > (reprB as IReprLiteral)._text
          ? 1
          : 0
        : -1;
    case Kind.Range:
      return (
        reprA._min - (reprB as IReprRange)._min ||
        reprA._max - (reprB as IReprRange)._max
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
function differenceReprs(reprsA: MReprs, reprsB: IReprs): MReprs {
  const reprs: MReprs = [];
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

function equalReprs(reprsA: IReprs, reprsB: IReprs): boolean {
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

function expandReprs(reprs: IReprs): string[] {
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

function intersectionRepr(reprA: MRepr, reprB: IRepr): MRepr | null {
  if (reprA._kind !== reprB._kind) {
    return null;
  }

  switch (reprA._kind) {
    case Kind.Literal:
      return reprA._text === (reprB as IReprLiteral)._text ? reprA : null;
    case Kind.Range: {
      const min = Math.max(reprA._min, (reprB as IReprRange)._min);
      const max = Math.min(reprA._max, (reprB as IReprRange)._max);
      return min > max ? null : { _kind: Kind.Range, _min: min, _max: max };
    }
  }
}

function intersectionReprs(reprsA: MReprs, reprsB: IReprs): MReprs {
  const reprs: MReprs = [];
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

function parse(text: string): MReprs {
  const reprs: MReprs = [];
  const chunks = text.split(',');
  for (let index = 0; index < chunks.length; ++index) {
    const chunk = chunks[index];
    if (chunk) {
      const repr = parseOne(chunk);
      unionReprs(reprs, repr);
    }
  }

  return reprs;
}

function parseOne(text: string): MRepr {
  if (numberPattern.test(text)) {
    return { _kind: Kind.Range, _min: +text, _max: +text };
  }

  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    return { _kind: Kind.Range, _min: +rangeMatch[1], _max: +rangeMatch[2] };
  }

  return { _kind: Kind.Literal, _text: text };
}

function serialize(reprs: IReprs): string {
  return reprs.map(serializeOne).join();
}

function serializeOne(repr: IRepr): string {
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

function subsetReprs(reprsA: IReprs, reprsB: IReprs): boolean {
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

function unionRepr(reprA: MRepr, reprB: IRepr): boolean {
  if (reprA._kind !== reprB._kind) {
    return false;
  }

  switch (reprA._kind) {
    case Kind.Literal: {
      const same = reprA._text === (reprB as IReprLiteral)._text;
      return same;
    }
    case Kind.Range: {
      const unionable =
        (reprA._min <= (reprB as IReprRange)._max + 1 &&
          reprA._max >= (reprB as IReprRange)._min) ||
        ((reprB as IReprRange)._min <= reprA._max + 1 &&
          (reprB as IReprRange)._max >= reprA._min);

      if (unionable) {
        reprA._min = Math.min(reprA._min, (reprB as IReprRange)._min);
        reprA._max = Math.max(reprA._max, (reprB as IReprRange)._max);
      }

      return unionable;
    }
  }
}

function unionReprs(reprs: MReprs, repr: MRepr): void {
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

function unionReprsAt(reprs: MReprs, repr: IRepr, index: number): boolean {
  if (index && index <= reprs.length && unionRepr(reprs[index - 1], repr)) {
    while (index < reprs.length && unionRepr(reprs[index - 1], reprs[index])) {
      reprs.splice(index, 1);
    }

    return true;
  }

  return false;
}
