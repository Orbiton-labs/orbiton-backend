type ObjectWithId = {
  id: any;
  [key: string]: any;
};

export const objectWithoutId = (obj: ObjectWithId) => {
  let { id, ...newObj } = obj;
  return newObj;
};
