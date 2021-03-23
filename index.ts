const KindLiteral = 0;
const KindRange = 1;

type Repr = ReprLiteral | ReprRange;
type ReprLiteral = { kind: typeof KindLiteral; text: string };
type ReprRange = { kind: typeof KindRange; min: number; max: number };

const numberPattern = /^\s*(?:0|[1-9]\d*)\s*$/;
const rangePattern = /^\s*(0|[1-9]\d*)\s*-\s*(0|[1-9]\d*)\s*$/;

export function difference(textA: string, textB: string): string {
  const reprsA = unionReprs(parse(textA));
  const reprsB = unionReprs(parse(textB));
  const reprs = differenceReprs(reprsA, reprsB);
  return serialize(reprs);
}

// eslint-disable-next-line complexity
function differenceReprs(reprsA: Repr[], reprsB: Repr[]): Repr[] {
  const reprs: Repr[] = [];
  loop: for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    switch (reprA.kind) {
      case KindLiteral:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB.kind === KindLiteral && reprB.text === reprA.text) {
            continue loop;
          }
        }

        reprs.push(reprA);
        break;
      case KindRange:
        for (let indexB = 0; indexB < reprsB.length; ++indexB) {
          const reprB = reprsB[indexB];
          if (reprB.kind === KindRange) {
            if (reprA.min >= reprB.min && reprA.max <= reprB.max) {
              continue loop;
            }

            if (reprA.min <= reprB.min && reprA.max >= reprB.max) {
              if (reprA.max > reprB.max) {
                reprsA.splice(indexA + 1, 0, {
                  kind: KindRange,
                  min: reprB.max + 1,
                  max: reprA.max,
                });
              }

              if (reprA.min < reprB.min) {
                reprsA.splice(indexA + 1, 0, {
                  kind: KindRange,
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

export function expand(text: string): string[] {
  const reprs = unionReprs(parse(text));
  return expandReprs(reprs);
}

function expandReprs(reprs: Repr[]): string[] {
  const texts: string[] = [];
  for (let index = 0; index < reprs.length; ++index) {
    const repr = reprs[index];
    switch (repr.kind) {
      case KindLiteral:
        texts.push(repr.text);
        break;
      case KindRange: {
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
  const reprsA = unionReprs(parse(textA));
  const reprsB = unionReprs(parse(textB));
  const reprs = intersectionReprs(reprsA, reprsB);
  return serialize(reprs);
}

function intersectionRepr(reprA: Repr, reprB: Repr): Repr | null {
  if (reprA.kind !== reprB.kind) {
    return null;
  }

  switch (reprA.kind) {
    case KindLiteral:
      return reprA.text === (reprB as ReprLiteral).text ? reprA : null;
    case KindRange: {
      const min = Math.max(reprA.min, (reprB as ReprRange).min);
      const max = Math.min(reprA.max, (reprB as ReprRange).max);
      return min > max ? null : { kind: KindRange, min, max };
    }
  }
}

function intersectionReprs(reprsA: Repr[], reprsB: Repr[]): Repr[] {
  const reprs: Repr[] = [];
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
  const reprs = unionReprs(parse(text));
  return serialize(reprs);
}

function order(reprA: Repr, reprB: Repr): number {
  if (reprA.kind !== reprB.kind) {
    return reprA.kind - reprB.kind;
  }

  switch (reprA.kind) {
    case KindLiteral:
      return reprA.text < (reprB as ReprLiteral).text ? -1 : 1;
    case KindRange:
      return (
        reprA.min - (reprB as ReprRange).min ||
        reprA.max - (reprB as ReprRange).max
      );
  }
}

function parse(text: string): Repr[] {
  return text.split(',').filter(Boolean).map(parseOne);
}

function parseOne(text: string): Repr {
  if (numberPattern.test(text)) {
    return { kind: KindRange, min: +text, max: +text };
  }

  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    return { kind: KindRange, min: +rangeMatch[1], max: +rangeMatch[2] };
  }

  return { kind: KindLiteral, text };
}

function serialize(reprs: Repr[]): string {
  return reprs.map(serializeOne).join();
}

function serializeOne(repr: Repr): string {
  switch (repr.kind) {
    case KindLiteral:
      return repr.text;
    case KindRange:
      return repr.min === repr.max ? `${repr.min}` : `${repr.min}-${repr.max}`;
  }
}

export function subset(textA: string, textB: string): boolean {
  const reprsA = unionReprs(parse(textA));
  const reprsB = unionReprs(parse(textB));
  return subsetReprs(reprsA, reprsB);
}

function subsetReprs(reprsA: Repr[], reprsB: Repr[]): boolean {
  loop: for (let indexB = 0; indexB < reprsB.length; ++indexB) {
    const reprB = reprsB[indexB];
    switch (reprB.kind) {
      case KindLiteral:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (reprA.kind === KindLiteral && reprA.text === reprB.text) {
            continue loop;
          }
        }

        return false;
      case KindRange:
        for (let indexA = 0; indexA < reprsA.length; ++indexA) {
          const reprA = reprsA[indexA];
          if (
            reprA.kind === KindRange &&
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
  const reprsA = unionReprs(parse(textA));
  const reprsB = unionReprs(parse(textB));
  const reprs = unionReprs(reprsA.concat(reprsB));
  return serialize(reprs);
}

function unionRepr(reprA: Repr, reprB: Repr): boolean {
  if (reprA.kind !== reprB.kind) {
    return false;
  }

  switch (reprA.kind) {
    case KindLiteral: {
      const same = reprA.text === (reprB as ReprLiteral).text;
      return same;
    }
    case KindRange: {
      const unionable =
        (reprA.min <= (reprB as ReprRange).max + 1 &&
          reprA.max >= (reprB as ReprRange).min) ||
        ((reprB as ReprRange).min <= reprA.max + 1 &&
          (reprB as ReprRange).max >= reprA.min);

      if (unionable) {
        reprA.min = Math.min(reprA.min, (reprB as ReprRange).min);
        reprA.max = Math.max(reprA.max, (reprB as ReprRange).max);
      }

      return unionable;
    }
  }
}

function unionReprReducer(reprs: Repr[], repr: Repr): Repr[] {
  if (reprs.length === 0 || !unionRepr(reprs[reprs.length - 1], repr)) {
    reprs.push(repr);
  }

  return reprs;
}

function unionReprs(reprs: Repr[]): Repr[] {
  return reprs.sort(order).reduce(unionReprReducer, []);
}
