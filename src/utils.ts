
/**
 * makes a class implement both normal interface & static interface
 * 
 * a class decorator
 * 
 * @example
 * `@staticImplements<StaticInterface>()
 * class A implements ClassInterface { }
 */
export const staticImplements = <T>() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @typescript-eslint/explicit-function-return-type
  return (constructor: T) => { }
}
