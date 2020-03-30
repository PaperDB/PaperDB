
import { ConverterRegistry, ReadonlyConverterRegistry } from './registry'
import { PaperDBDate } from '../types'

export const DEFAULT_CONVERTERS = {
  'date': PaperDBDate,
}

/**
 * the default `ConverterRegistry`
 */
export const DEFAULT_CONVERTER_REGISTRY =
  new ConverterRegistry(Object.values(DEFAULT_CONVERTERS)) as ReadonlyConverterRegistry<typeof DEFAULT_CONVERTERS>
