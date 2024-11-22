// import PoolRepository from "../../apis/repositories/pool.repository";
// import PositionRepository from "src/apis/repositories/position.repository";
// import { PoolWrapper,  } from "orbiton-contracts";
// import { Address } from "@ton/core";

// export const syncPools = async () => {
//   const pools = await PoolRepository.getAll();
//   for (const pool of pools) {
//     const poolContract = new PoolWrapper.PoolTest(
//       Address.parse(pool.poolAddress)
//     );
//     const positions = await PositionRepository.getAll({
//       poolId: pool._id.toString(),
//     });
//     const positionContracts = positions.map(
//       (position) =>
//         new PositionWr.PositionTest(Address.parse(position.positionAddress))
//     );
//   }
// };

// const syncPosition = async (positionAddress: string) => {};
