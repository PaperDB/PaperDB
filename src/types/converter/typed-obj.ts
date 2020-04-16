
/**
 * TypedObject:  
 * 
 * A self-describing, versioned, and json-competible (plain) object format    
 * 
 * Designed to be a universal object notation for complex objects,  
 * or types that json doesn't support natively (such as Date, BigInt, literal undefined, etc.)
 */
export type TypedObj<Type extends string, Version extends number = 1> = {
  [x: string]: any;

  /**
   * name of the object type
   * 
   * MUST be unique in an app
   * 
   * Naming Guideline:  
   * - For common types (Date, BigInt, etc.), `$type` can simply be its class name, or its common name. (e.g. `date`, `undefined`) 
   * - For non-common types, `$type` should prefix with a namespace, like `namespace:name`. (e.g. `232c:space_manifest`)
   * - Must be alphanumeric, with a colon (if prefix with a namespace), underscores, hyphens, and dots
   */
  $type: Type;

  /**
   * version of the object type (only the MAJOR version number)  
   * MUST adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
   *   
   * For common types, `$v` can be omitted  
   * If omitted, the default version is `1` when parsing
   */
  $v?: Version;
} & (Version extends 1 ? {} : { $v: Version }) // the `$v` property is optional when `Version` is omitted or `Version` is 1
