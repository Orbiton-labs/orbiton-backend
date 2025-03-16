export const encodeResponseObject = (obj: Object) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value === null || value === undefined) {
      acc[key] = '';
    } else if (key === 'timestamp' && value instanceof Date) {
      acc[key] = value.toISOString();
    } else {
      acc[key] = String(value);
    }
    return acc;
  }, {});
};
