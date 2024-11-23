export interface IPool {
  poolAddress: string; // Must pass Address.isFriendly validation
  jetton0WalletAddress: string;
  jetton1WalletAddress: string;
  fee: number;
  tickSpacing: number;
  liquidity?: string; // Default: "0"
  totalVolume?: string; // Default: "0"
  totalFee?: string; // Default: "0"
  createdAt?: Date; // Automatically added by Mongoose with timestamps
  updatedAt?: Date; // Automatically added by Mongoose with timestamps
}

export interface IPosition {
  poolId: string; // Must pass Address.isFriendly validation
  positionAddress: string; // Must pass Address.isFriendly validation
  tickLower: number;
  tickUpper: number;
  liquidity?: string; // Default: "0"
  feeGrowthInside0LastX128?: string; // Default: "0"
  feeGrowthInside1LastX128?: string; // Default: "0"
  tokenOwed0?: string; // Default: "0"
  tokenOwed1?: string; // Default: "0"
  ownerAddress: string; // Must pass Address.isFriendly validation
  createdAt?: Date; // Automatically added by Mongoose with timestamps
  updatedAt?: Date; // Automatically added by Mongoose with timestamps
}

export interface IProcessedTransaction {
  transactionHash: string;
  messageIndex: number;
}

export interface IToken {
  _id: string;
  type: string;
  address: string;
  name: string;
  symbol: string;
  description: string | null;
  image: string;
  decimals: number;
  aliased: boolean;
  price: string;
  source: string | null;
}
