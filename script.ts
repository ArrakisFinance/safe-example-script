import {ethers} from "ethers";
import Safe, { EthersAdapter }  from '@safe-global/protocol-kit';
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import abi from "./abi.json";
import * as dotenv from "dotenv";

const ARRAKIS_V2_ROUTER = "0x6aC8Bab8B775a03b8B72B2940251432442f61B94";
const AMOUNT_0 = "500000000000000";
const AMOUNT_1 = "700000";

dotenv.config({ path: __dirname + "/.env" });
const ALCHEMY_ID = process.env.ALCHEMY_ID;

const provider = new ethers.providers.AlchemyProvider(10, ALCHEMY_ID);

async function main() {
  const arrakisV2Router = new ethers.Contract(
    ARRAKIS_V2_ROUTER,
    abi,
    provider
  );

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider
  });

  const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapter, safeAddress: "0x19E3895299DF643f47f0f6f0567f84FEA46E9aFa" });
  
  const payload = arrakisV2Router.interface.encodeFunctionData("addLiquidity", [
    {
      amount0Max: AMOUNT_0,
      amount1Max: AMOUNT_1,
      amount0Min: 0,
      amount1Min: 0,
      amountSharesMin: 0,
      vault: "0xe10546beE6424213dd9c80edd55E90Fea96E6e11",
      receiver: "0x19E3895299DF643f47f0f6f0567f84FEA46E9aFa",
      gauge: "0xd9723FffDA369d119fbd66a15113144Bf76e281C",
    }
  ]);
  const token0C = new ethers.Contract("0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb", ["function approve(address,uint256) external returns (bool)"], provider);

  const payloadA0 = token0C.interface.encodeFunctionData("approve", [ARRAKIS_V2_ROUTER, AMOUNT_0]);

  const payloadA1 = token0C.interface.encodeFunctionData("approve", [ARRAKIS_V2_ROUTER, AMOUNT_1]);

  const safeTransactionData: MetaTransactionData[] = [
    {
      to: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
      data: payloadA0,
      value: "0",
    },
    {
      to: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      data: payloadA1,
      value: "0",
    },
    {
      to: ARRAKIS_V2_ROUTER,
      data: payload,
      value: "0",
    },
  ];

  const safeTransaction = await safeSdk.createTransaction({ safeTransactionData, onlyCalls: true });

  console.log(safeTransaction.data);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});