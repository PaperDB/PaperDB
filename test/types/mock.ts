
import { Conversion, TypedObj, ERR_TYPED_OBJ_INVALID } from '../../src/types/converter'

interface Test1ObjV1 extends TypedObj<'test1'> {
  abc: '123';
}

interface Test1ObjV2 extends TypedObj<'test1', 2> {
  def: string;
}

interface NestedObj extends TypedObj<'nested', 0> {
  test1: Test1ObjV2;
}

@Conversion<Test1ObjV1>()
export class ConverterTest1V1 {
  static readonly $type = 'test1'
  static readonly $v = 1

  readonly abc = '123'

  async toTypedObj (): Promise<Test1ObjV1> {
    return Promise.resolve({
      $type: 'test1',
      abc: this.abc,
    })
  }

  static async fromTypedObj (obj: Test1ObjV1): Promise<ConverterTest1V1> {
    if (obj.$type !== 'test1' || (obj?.$v !== 1) || obj.abc !== '123') {
      throw ERR_TYPED_OBJ_INVALID
    }

    return Promise.resolve(new ConverterTest1V1())
  }
}

@Conversion<Test1ObjV2>()
export class ConverterTest1V2 {
  static readonly $type = 'test1'
  static readonly $v = 2

  readonly def = '456'

  async toTypedObj (): Promise<Test1ObjV2> {
    return Promise.resolve({
      $type: 'test1',
      $v: 2,
      def: this.def,
    })
  }

  static async fromTypedObj (obj: Test1ObjV2): Promise<ConverterTest1V2> {
    if (obj.$type !== 'test1' || (obj.$v !== 2) || typeof obj.def !== 'string') {
      throw ERR_TYPED_OBJ_INVALID
    }

    return Promise.resolve(new ConverterTest1V2())
  }
}

@Conversion<NestedObj>()
export class ConverterNested {
  static readonly $type = 'nested'
  static readonly $v = 0

  constructor (public test1: ConverterTest1V2) { }

  async toTypedObj (): Promise<NestedObj> {
    return {
      $type: 'nested',
      $v: 0,
      test1: await this.test1.toTypedObj(),
    }
  }

  static async fromTypedObj (obj: NestedObj): Promise<ConverterNested> {
    if (obj.$type !== 'nested' || (obj.$v !== 0)) {
      throw ERR_TYPED_OBJ_INVALID
    }

    return new ConverterNested(await ConverterTest1V2.fromTypedObj(obj.test1))
  }
}
