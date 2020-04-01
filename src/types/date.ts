
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

  static fromTypedObj (obj: PaperDBDateObj | PaperDBDate | Date): PaperDBDate {
    if (obj instanceof Date) {
      return new PaperDBDate(obj)
    }

    if (obj.$type !== 'date' || typeof obj.iso8601 !== 'string') {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new PaperDBDate(obj.iso8601)
  }
}
