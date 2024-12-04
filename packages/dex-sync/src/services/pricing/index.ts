import { IToken } from "../../@types";

const tokenPriceConfig = {
  ["EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE"]: {
    id: 1,
    type: "jetton",
    address: "EQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE",
    name: "DeDust",
    symbol: "DUST",
    image: "https://assets.dedust.io/images/dust.gif",
    decimals: 9,
    aliased: true,
    price: "3.4708",
    source: null,
  },
  ["EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"]: {
    id: 2,
    type: "jetton",
    address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    name: "Tether USD",
    symbol: "USDT",
    image: "https://assets.dedust.io/images/usdt.webp",
    decimals: 6,
    aliased: true,
    price: "1.001",
    source: {
      chain: "eip155:1",
      address: "",
      bridge: "",
      symbol: "USDT",
      name: "Tether USD",
    },
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
