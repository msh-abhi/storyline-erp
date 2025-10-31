/**
 * Check if a value is an object (but not an array or null)
 */
const isObject = (value: any): value is Record<string, any> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Check if a value is an array
 */
const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = { [key: string]: any };

/**
 * Converts a string from snake_case to camelCase.
 * @param str The string to convert.
 * @returns The camelCase version of the string.
 */
export const snakeToCamel = (str: string): string =>
  str.replace(/([-_][a-z0-9])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );

/**
 * Converts a string from camelCase to snake_case.
 * @param str The string to convert.
 * @returns The snake_case version of the string.
 */
export const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
     .replace(/([a-z])([0-9])/g, '$1_$2')  // Insert underscore before numbers
     .replace(/([0-9])([a-z])/g, '$1_$2'); // Insert underscore after numbers

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

    // HACK: This is a workaround for a database schema that is out of sync with the frontend types.
    // This ensures that the frontend code doesn't crash and that calculations don't result in NaN.
    // This should be removed once the database schema is updated.
    if (newObj.hasOwnProperty('totalPrice') === false && newObj.hasOwnProperty('unitPrice')) {
      newObj.totalPrice = 0;
    }
    if (newObj.hasOwnProperty('profit') === false && newObj.hasOwnProperty('unitPrice')) {
      newObj.profit = 0;
    }
    if (newObj.hasOwnProperty('outstandingBalance') === false && newObj.hasOwnProperty('email')) {
        newObj.outstandingBalance = 0;
    }
    if (newObj.hasOwnProperty('totalCost') === false && newObj.hasOwnProperty('unitCost')) {
        newObj.totalCost = 0;
    }
    if (newObj.hasOwnProperty('customerPrice') === false && newObj.hasOwnProperty('code')) {
        newObj.customerPrice = 0;
    }
    if (newObj.hasOwnProperty('resellerPrice') === false && newObj.hasOwnProperty('code')) {
        newObj.resellerPrice = 0;
    }
    if (newObj.hasOwnProperty('purchasePrice') === false && newObj.hasOwnProperty('code')) {
        newObj.purchasePrice = 0;
    }
    if (newObj.hasOwnProperty('customerPrice') === false && newObj.hasOwnProperty('serialNumber')) {
        newObj.customerPrice = 0;
    }
    if (newObj.hasOwnProperty('resellerPrice') === false && newObj.hasOwnProperty('serialNumber')) {
        newObj.resellerPrice = 0;
    }
    if (newObj.hasOwnProperty('purchasePrice') === false && newObj.hasOwnProperty('serialNumber')) {
        newObj.purchasePrice = 0;
    }
    if (newObj.hasOwnProperty('macAddress') === false && newObj.hasOwnProperty('email')) {
        newObj.macAddress = '';
    }

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
      const newKey = key === 'user_id' ? 'user_id' : camelToSnake(key);
      newObj[newKey] = keysToSnake((obj as AnyObject)[key]);
    });
    return newObj as T;
  } else if (isArray(obj)) {
    return (obj as unknown as any[]).map((i) => keysToSnake(i)) as T;
  }
  return obj;
};
