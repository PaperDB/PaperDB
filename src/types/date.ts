
/**
 * Date
 */

import { TypedObj, Conversion, ERR_TYPED_OBJ_INVALID } from './converter'

export interface PaperDBDateObj extends TypedObj<'date'> {
  iso8601: string;
}

/**
 * a cut-in replacement of the built-in Date class 
 */
@Conversion<PaperDBDateObj>()
export class PaperDBDate extends Date {
  static readonly $type = 'date'
  static readonly $v = 1

  toTypedObj (): PaperDBDateObj {
    return {
      $type: 'date',
      iso8601: this.toISOString(),
    }
  }

  toTimestamp (): PaperDBTimestamp {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new PaperDBTimestamp(this.getTime())
  }

  static fromTypedObj (obj: PaperDBDateObj | PaperDBDate): PaperDBDate {
    if (obj instanceof PaperDBDate) {
      return obj
    }

    if (obj.$type !== 'date' || typeof obj.iso8601 !== 'string') {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new PaperDBDate(obj.iso8601)
  }
}

export interface TimestampObj extends TypedObj<'timestamp'> {
  /**
   * milliseconds since the Unix epoch
   */
  ms: number;
}

@Conversion<TimestampObj>()
export class PaperDBTimestamp {
  static readonly $type = 'timestamp'
  static readonly $v = 1

  constructor (public readonly ms: number) { }

  toTypedObj (): TimestampObj {
    return {
      $type: 'timestamp',
      ms: this.ms,
    }
  }

  toDate (): PaperDBDate {
    return new PaperDBDate(this.ms)
  }

  static fromTypedObj (obj: TimestampObj | PaperDBTimestamp): PaperDBTimestamp {
    if (obj instanceof PaperDBTimestamp) {
      return obj
    }

    if (obj.$type !== 'timestamp' || typeof obj.ms === 'undefined' || obj.ms === null || isNaN(+obj.ms) || !isFinite(+obj.ms)) {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new PaperDBTimestamp(+obj.ms)
  }
}
