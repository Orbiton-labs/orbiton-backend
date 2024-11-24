import { IToken } from "../../@types";

const tokenPriceConfig = {
  ["EQAPO1zvTf0QNVIJH-jYod2CX-UbsbsM7dhg5i4g-TcjhulI"]: {
    type: "jetton",
    address: "EQAPO1zvTf0QNVIJH-jYod2CX-UbsbsM7dhg5i4g-TcjhulI",
    name: "TestToken1",
    symbol: "TT1",
    image: "https://assets.dedust.io/images/dust.gif",
    decimals: 9,
    price: "3.7803",
    alias: true,
  },
  ["EQBepgOjNIH7wBKDB3Lcfz3UkOuB_tCs8t1LGNvLmlxZ4BJ6"]: {
    type: "jetton",
    address: "EQBepgOjNIH7wBKDB3Lcfz3UkOuB_tCs8t1LGNvLmlxZ4BJ6",
    name: "TestToken2",
    symbol: "TT2",
    image: "https://assets.dedust.io/images/usdt.webp",
    decimals: 9,
    price: "0.9983",
    alias: true,
  },
};

export const getTokenInfoByTokenMaster = (tokenMaster: string): IToken => {
  return tokenPriceConfig?.[tokenMaster];
};

// export const syncTokens = async () => {
//   while (true) {
//     const data = await fetch(env.server.priceApi).then((res) => res.json());
//     for (const tokenMaster in data) {
//       tokenPriceConfig[tokenMaster] = data[tokenMaster];
//     }
//     await setTimeout(3000);
//   }
// };
