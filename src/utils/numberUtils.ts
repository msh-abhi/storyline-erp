// Helper function to ensure a value is a number, otherwise return 0
export const ensureNumber = (value: any): number => {
  const num = Number(value);
  if (isNaN(num)) {
    console.warn(`ensureNumber: Encountered NaN for value:`, value);
    return 0;
  }
  return num;
};
