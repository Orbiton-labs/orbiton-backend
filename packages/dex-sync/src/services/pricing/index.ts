const tokenPriceConfig = {
  ["EQBlfbILSO9PXXOOn2Dm_50vPv9WTRhlFrnhPg9gp80gZ5DA"]: 4,
  ["EQBrQSheyrZrHNaCprHELiC0hH-JPmqGaYkhpW2Mlt17EMcL"]: 1,
};

export const getPriceByTokenMaster = (tokenMaster: string): number => {
  return tokenPriceConfig[tokenMaster];
};
