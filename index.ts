export type Repr = Literal | Range;

export type Literal = {
  /** @internal */ _isLiteral: 1;
  /** @internal */ _text: string;
};

export type Range = {
  /** @internal */ _isLiteral: 0;
  /** @internal */ _min: number;
  /** @internal */ _max: number;
};

const numberPattern = /^(?:0|[1-9]\d*)$/;
const rangePattern = /^(0|[1-9]\d*)\s*-\s*(0|[1-9]\d*)$/;

export function _compare(reprA: Repr, reprB: Repr): number {
  if (reprA._isLiteral !== reprB._isLiteral) {
    return reprB._isLiteral - reprA._isLiteral;
  }

  if (reprA._isLiteral) {
    return reprA._text >= (reprB as Literal)._text
      ? reprA._text > (reprB as Literal)._text
        ? 1
        : 0
      : -1;
  }

  return (
    reprA._min - (reprB as Range)._min || reprA._max - (reprB as Range)._max
  );
}

export function _createLiteral(text: string): Repr {
  return { _isLiteral: 1, _text: text };
}

export function _createRange(min: number, max: number): Repr {
  return { _isLiteral: 0, _min: min, _max: max };
}

export function difference(textA: string, textB: string): string {
  const reprsA = _parse(textA);
  const reprsB = _parse(textB);
  const reprs = _differenceReprs(reprsA, reprsB);
  return _serialize(reprs);
}

// eslint-disable-next-line complexity -- This function IS complex.
export function _differenceReprs(reprsA: Repr[], reprsB: Repr[]): Repr[] {
  const reprs: Repr[] = [];
  loop: for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    if (reprA._isLiteral) {
      for (let indexB = 0; indexB < reprsB.length; ++indexB) {
        const reprB = reprsB[indexB];
        if (reprB._isLiteral && reprB._text === reprA._text) {
          continue loop;
        }
      }
    } else {
      for (let indexB = 0; indexB < reprsB.length; ++indexB) {
        const reprB = reprsB[indexB];
        if (!reprB._isLiteral) {
          if (reprA._min >= reprB._min && reprA._max <= reprB._max) {
            continue loop;
          }

          if (reprA._min <= reprB._min && reprA._max >= reprB._max) {
            if (reprA._max > reprB._max) {
              reprsA.splice(
                indexA + 1,
                0,
                _createRange(reprB._max + 1, reprA._max),
              );
            }

            if (reprA._min < reprB._min) {
              reprsA.splice(
                indexA + 1,
                0,
                _createRange(reprA._min, reprB._min - 1),
              );
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
    }

    reprs.push(reprA);
  }

  return reprs;
}

export function equal(textA: string, textB: string): boolean {
  const reprsA = _parse(textA);
  const reprsB = _parse(textB);
  return _equalReprs(reprsA, reprsB);
}

export function _equalReprs(reprsA: Repr[], reprsB: Repr[]): boolean {
  if (reprsA.length !== reprsB.length) {
    return false;
  }

  for (let index = 0; index < reprsA.length; ++index) {
    if (_compare(reprsA[index], reprsB[index])) {
      return false;
    }
  }

  return true;
}

export function expand(text: string): string[] {
  const reprs = _parse(text);
  return _expandReprs(reprs);
}

export function _expandReprs(reprs: Repr[]): string[] {
  const texts: string[] = [];
  for (let index = 0; index < reprs.length; ++index) {
    const repr = reprs[index];
    if (repr._isLiteral) {
      texts.push(repr._text);
    } else {
      for (let index = repr._min; index <= repr._max; ++index) {
        texts.push(`${index}`);
      }
    }
  }

  return texts;
}

export function intersection(textA: string, textB: string): string {
  const reprsA = _parse(textA);
  const reprsB = _parse(textB);
  const reprs = _intersectionReprs(reprsA, reprsB);
  return _serialize(reprs);
}

export function _intersectionRepr(reprA: Repr, reprB: Repr): Repr | null {
  if (reprA._isLiteral !== reprB._isLiteral) {
    return null;
  }

  if (reprA._isLiteral) {
    return reprA._text === (reprB as Literal)._text ? reprA : null;
  }

  const min = Math.max(reprA._min, (reprB as Range)._min);
  const max = Math.min(reprA._max, (reprB as Range)._max);
  return min > max ? null : _createRange(min, max);
}

export function _intersectionReprs(reprsA: Repr[], reprsB: Repr[]): Repr[] {
  const reprs: Repr[] = [];
  for (let indexA = 0; indexA < reprsA.length; ++indexA) {
    const reprA = reprsA[indexA];
    for (let indexB = 0; indexB < reprsB.length; ++indexB) {
      const reprB = reprsB[indexB];
      const repr = _intersectionRepr(reprA, reprB);
      if (repr !== null) {
        reprs.push(repr);
      }
    }
  }

  return reprs;
}

export function normalize(text: string): string {
  const reprs = _parse(text);
  return _serialize(reprs);
}

export function _parse(text: string): Repr[] {
  const reprs: Repr[] = [];
  const chunks = text.split(',');
  for (let index = 0; index < chunks.length; ++index) {
    const chunk = chunks[index].trim();
    if (chunk) {
      const repr = _parseOne(chunk);
      _unionReprs(reprs, repr);
    }
  }

  return reprs;
}

export function _parseOne(text: string): Repr {
  if (numberPattern.test(text)) {
    const number = +text;
    return _createRange(number, number);
  }

  const rangeMatch = rangePattern.exec(text);
  if (rangeMatch) {
    const a = +rangeMatch[1];
    const b = +rangeMatch[2];
    return _createRange(Math.min(a, b), Math.max(a, b));
  }

  return _createLiteral(text);
}

export function _serialize(reprs: Repr[]): string {
  return reprs.map(_serializeOne).join();
}

export function _serializeOne(repr: Repr): string {
  if (repr._isLiteral) {
    return repr._text;
  }

  return repr._min === repr._max ? `${repr._min}` : `${repr._min}-${repr._max}`;
}

export function subset(textA: string, textB: string): boolean {
  const reprsA = _parse(textA);
  const reprsB = _parse(textB);
  return _subsetReprs(reprsA, reprsB);
}

export function _subsetReprs(reprsA: Repr[], reprsB: Repr[]): boolean {
  loop: for (let indexB = 0; indexB < reprsB.length; ++indexB) {
    const reprB = reprsB[indexB];
    if (reprB._isLiteral) {
      for (let indexA = 0; indexA < reprsA.length; ++indexA) {
        const reprA = reprsA[indexA];
        if (reprA._isLiteral && reprA._text === reprB._text) {
          continue loop;
        }
      }
    } else {
      for (let indexA = 0; indexA < reprsA.length; ++indexA) {
        const reprA = reprsA[indexA];
        if (
          !reprA._isLiteral &&
          reprA._min <= reprB._min &&
          reprA._max >= reprB._max
        ) {
          continue loop;
        }
      }
    }

    return false;
  }

  return true;
}

export function union(textA: string, textB: string): string {
  const reprs = _parse(`${textA},${textB}`);
  return _serialize(reprs);
}

export function _unionRepr(reprA: Repr, reprB: Repr): boolean {
  if (reprA._isLiteral !== reprB._isLiteral) {
    return false;
  }

  if (reprA._isLiteral) {
    const same = reprA._text === (reprB as Literal)._text;
    return same;
  }

  const unionable =
    (reprA._min <= (reprB as Range)._max + 1 &&
      reprA._max >= (reprB as Range)._min) ||
    ((reprB as Range)._min <= reprA._max + 1 &&
      (reprB as Range)._max >= reprA._min);

  if (unionable) {
    reprA._min = Math.min(reprA._min, (reprB as Range)._min);
    reprA._max = Math.max(reprA._max, (reprB as Range)._max);
  }

  return unionable;
}

export function _unionReprs(reprs: Repr[], repr: Repr): void {
  let low = 0;
  let high = reprs.length;
  while (low < high) {
    // eslint-disable-next-line no-bitwise -- This is much faster than Math.floor.
    const middle = (low + high) >>> 1;
    const result = _compare(repr, reprs[middle]);
    if (!result) {
      return;
    }

    if (result < 0) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  if (
    !_unionReprsAt(reprs, repr, low) &&
    !_unionReprsAt(reprs, repr, low + 1)
  ) {
    reprs.splice(low, 0, repr);
  }
}

export function _unionReprsAt(
  reprs: Repr[],
  repr: Repr,
  index: number,
): boolean {
  if (index && index <= reprs.length && _unionRepr(reprs[index - 1], repr)) {
    while (index < reprs.length && _unionRepr(reprs[index - 1], reprs[index])) {
      reprs.splice(index, 1);
    }

    return true;
  }

  return false;
}
