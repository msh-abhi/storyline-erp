
import { isObject, isArray } from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = { [key: string]: any };

/**
 * Converts a string from snake_case to camelCase.
 * @param str The string to convert.
 * @returns The camelCase version of the string.
 */
export const snakeToCamel = (str: string): string =>
  str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );

/**
 * Converts a string from camelCase to snake_case.
 * @param str The string to convert.
 * @returns The snake_case version of the string.
 */
export const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * Deeply converts the keys of an object from snake_case to camelCase.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys.
 */
export const keysToCamel = <T>(obj: T): T => {
  if (isObject(obj) && !isArray(obj)) {
    const newObj: AnyObject = {};
    Object.keys(obj as AnyObject).forEach((key) => {
      const newKey = snakeToCamel(key);
      newObj[newKey] = keysToCamel((obj as AnyObject)[key]);
    });
    return newObj as T;
  } else if (isArray(obj)) {
    return (obj as unknown as any[]).map((i) => keysToCamel(i)) as T;
  }
  return obj;
};

/**
 * Deeply converts the keys of an object from camelCase to snake_case.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys.
 */
export const keysToSnake = <T>(obj: T): T => {
  if (isObject(obj) && !isArray(obj)) {
    const newObj: AnyObject = {};
    Object.keys(obj as AnyObject).forEach((key) => {
      const newKey = camelToSnake(key);
      newObj[newKey] = keysToSnake((obj as AnyObject)[key]);
    });
    return newObj as T;
  } else if (isArray(obj)) {
    return (obj as unknown as any[]).map((i) => keysToSnake(i)) as T;
  }
  return obj;
};
