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
type MReprLiteral = { kind: Kind.Literal; text: string };
type MReprRange = { kind: Kind.Range; min: number; max: number };

const numberPattern = /^\s*(?:0|[1-9]\d*)\s*$/;
const rangePattern = /^\s*(0|[1-9]\d*)\s*-\s*(0|[1-9]\d*)\s*$/;

function cloneRepr(repr: IRepr): MRepr {
  switch (repr.kind) {
    case Kind.Literal:
      return { kind: Kind.Literal, text: repr.text };
    case Kind.Range:
      return { kind: Kind.Range, min: repr.min, max: repr.max };
  }
}

function compare(reprA: IRepr, reprB: IRepr): number {
  if (reprA.kind !== reprB.kind) {
    return reprA.kind - reprB.kind;
  }

  switch (reprA.kind) {
    case Kind.Literal:
      return reprA.text >= (reprB as IReprLiteral).text
        ? reprA.text > (reprB as IReprLiteral).text
          ? 1
          : 0
        : -1;
    case Kind.Range:
      return (
        reprA.min - (reprB as IReprRange).min ||
        reprA.max - (reprB as IReprRange).max
      );
  }
}

export function difference(textA: string, textB: string): string {
  const reprsA = parse(textA);
  const reprsB = parse(textB);
  const reprs = differenceReprs(reprsA, reprsB);
  return serialize(reprs);
}

// eslint-disable-next-line complexity
function differenceReprs(reprsA: MReprs, reprsB: IReprs): MReprs {
  const reprs: MReprs = [];
  loop: for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    switch (reprA.kind) {
      case Kind.Literal:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB.kind === Kind.Literal && reprB.text === reprA.text) {
            continue loop;
          }
        }

        reprs.push(reprA);
        break;
      case Kind.Range:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB.kind === Kind.Range) {
            if (reprA.min >= reprB.min && reprA.max <= reprB.max) {
              continue loop;
            }

            if (reprA.min <= reprB.min && reprA.max >= reprB.max) {
              if (reprA.max > reprB.max) {
                reprsA.splice(indexA + 1, 0, {
                  kind: Kind.Range,
                  min: reprB.max + 1,
                  max: reprA.max,
                });
              }

              if (reprA.min < reprB.min) {
                reprsA.splice(indexA + 1, 0, {
                  kind: Kind.Range,
                  min: reprA.min,
                  max: reprB.min - 1,
                });
              }

              continue loop;
            }

            if (reprA.min >= reprB.min && reprA.min <= reprB.max) {
              reprA.min = reprB.max + 1;
            } else if (reprA.max >= reprB.min && reprA.max <= reprB.max) {
              reprA.max = reprB.min - 1;
            }
          }
        }

        reprs.push(reprA);
        break;
    }
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
    if (compare(reprsA[index], reprsB[index]) !== 0) {
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
    switch (repr.kind) {
      case Kind.Literal:
        texts.push(repr.text);
        break;
      case Kind.Range: {
        for (let index = repr.min; index <= repr.max; ++index) {
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

function intersectionRepr(reprA: IRepr, reprB: IRepr): MRepr | null {
  if (reprA.kind !== reprB.kind) {
    return null;
  }

  switch (reprA.kind) {
    case Kind.Literal:
      return reprA.text === (reprB as IReprLiteral).text ? reprA : null;
    case Kind.Range: {
      const min = Math.max(reprA.min, (reprB as IReprRange).min);
      const max = Math.min(reprA.max, (reprB as IReprRange).max);
      return min > max ? null : { kind: Kind.Range, min, max };
    }
  }
}

function intersectionReprs(reprsA: IReprs, reprsB: IReprs): MReprs {
  const reprs: MReprs = [];
  for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    for (let indexB = 0; indexB < reprsB.length; ++indexB) {
      const reprB = reprsB[indexB];
      const repr = intersectionRepr(reprA, reprB);
      if (repr !== null) {
        reprs.push(cloneRepr(repr));
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
  return unionReprs(text.split(',').filter(Boolean).map(parseOne));
}

function parseOne(text: string): MRepr {
  if (numberPattern.test(text)) {
    return { kind: Kind.Range, min: +text, max: +text };
  }

  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    return { kind: Kind.Range, min: +rangeMatch[1], max: +rangeMatch[2] };
  }

  return { kind: Kind.Literal, text };
}

function serialize(reprs: IReprs): string {
  return reprs.map(serializeOne).join();
}

function serializeOne(repr: IRepr): string {
  switch (repr.kind) {
    case Kind.Literal:
      return repr.text;
    case Kind.Range:
      return repr.min === repr.max ? `${repr.min}` : `${repr.min}-${repr.max}`;
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
    switch (reprB.kind) {
      case Kind.Literal:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (reprA.kind === Kind.Literal && reprA.text === reprB.text) {
            continue loop;
          }
        }

        return false;
      case Kind.Range:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (
            reprA.kind === Kind.Range &&
            reprB.min >= reprA.min &&
            reprB.max <= reprA.max
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
  const reprs = parse(textA + ',' + textB);
  return serialize(reprs);
}

function unionRepr(reprA: MRepr, reprB: IRepr): boolean {
  if (reprA.kind !== reprB.kind) {
    return false;
  }

  switch (reprA.kind) {
    case Kind.Literal: {
      const same = reprA.text === (reprB as IReprLiteral).text;
      return same;
    }
    case Kind.Range: {
      const unionable =
        (reprA.min <= (reprB as IReprRange).max + 1 &&
          reprA.max >= (reprB as IReprRange).min) ||
        ((reprB as IReprRange).min <= reprA.max + 1 &&
          (reprB as IReprRange).max >= reprA.min);

      if (unionable) {
        reprA.min = Math.min(reprA.min, (reprB as IReprRange).min);
        reprA.max = Math.max(reprA.max, (reprB as IReprRange).max);
      }

      return unionable;
    }
  }
}

function unionReprReducer(reprs: MReprs, repr: IRepr): MReprs {
  if (reprs.length === 0 || !unionRepr(reprs[reprs.length - 1], repr)) {
    reprs.push(cloneRepr(repr));
  }

  return reprs;
}

function unionReprs(reprs: MReprs): MReprs {
  return reprs.sort(compare).reduce(unionReprReducer, []);
}
