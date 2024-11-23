import { IToken } from "../../@types";

const tokenPriceConfig = {
  ["EQAJmXoHKPsbrriLEfElP6N9mGDlsSHMZI0ZbTtq_NyJTQ43"]: {
    type: "jetton",
    address: "EQAJmXoHKPsbrriLEfElP6N9mGDlsSHMZI0ZbTtq_NyJTQ43",
    name: "DeDust",
    symbol: "DUST",
    image: "https://assets.dedust.io/images/dust.gif",
    decimals: 9,
    price: "3.7803",
    alias: true,
  },
  ["EQB1AmBvXCeHrUh9-N7yASBPxVfKD5NJg9AB0cbakt_fDZ5P"]: {
    type: "jetton",
    address: "EQB1AmBvXCeHrUh9-N7yASBPxVfKD5NJg9AB0cbakt_fDZ5P",
    name: "Tether USD",
    symbol: "USDT",
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
