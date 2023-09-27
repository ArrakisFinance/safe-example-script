import {ethers} from "ethers";
import Safe, { EthersAdapter }  from '@safe-global/protocol-kit';
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import abi from "./abi.json";
import * as dotenv from "dotenv";
import SafeApiKit, {ProposeTransactionProps} from '@safe-global/api-kit';

const ARRAKIS_V2_ROUTER = "0x6aC8Bab8B775a03b8B72B2940251432442f61B94";
const AMOUNT_0 = "500000000000000";
const AMOUNT_1 = "700000";
const TOKEN_0 = "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb";
const TOKEN_1 = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
const SAFE = "0x19E3895299DF643f47f0f6f0567f84FEA46E9aFa";
const CHAINID = 10;
const VAULT = "0xe10546beE6424213dd9c80edd55E90Fea96E6e11";
const GAUGE = "0xd9723FffDA369d119fbd66a15113144Bf76e281C";
const SERVICE_URL = "https://safe-transaction-optimism.safe.global/";

dotenv.config({ path: __dirname + "/.env" });
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const SK = process.env.SK;

const provider = new ethers.providers.AlchemyProvider(CHAINID, ALCHEMY_ID);
const signer = new ethers.Wallet(SK!=undefined ? SK : "", provider);

async function main() {
  const arrakisV2Router = new ethers.Contract(
    ARRAKIS_V2_ROUTER,
    abi,
    provider
  );

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer
  });

  const safeService = new SafeApiKit({
    txServiceUrl: SERVICE_URL,
    ethAdapter
  })

  const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapter, safeAddress: SAFE });
  
  const payload = arrakisV2Router.interface.encodeFunctionData("addLiquidity", [
    {
      amount0Max: AMOUNT_0,
      amount1Max: AMOUNT_1,
      amount0Min: 0,
      amount1Min: 0,
      amountSharesMin: 0,
      vault: VAULT,
      receiver: SAFE,
      gauge: GAUGE,
    }
  ]);
  const token0C = new ethers.Contract(TOKEN_0, ["function approve(address,uint256) external returns (bool)"], provider);

  const payloadA0 = token0C.interface.encodeFunctionData("approve", [ARRAKIS_V2_ROUTER, AMOUNT_0]);

  const payloadA1 = token0C.interface.encodeFunctionData("approve", [ARRAKIS_V2_ROUTER, AMOUNT_1]);

  const safeTransactionData: MetaTransactionData[] = [
    {
      to: TOKEN_0,
      data: payloadA0,
      value: "0",
    },
    {
      to: TOKEN_1,
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
  const stxh = await safeSdk.getTransactionHash(safeTransaction);
  const sig = await safeSdk.signTransactionHash(stxh);

  const transactionConfig: ProposeTransactionProps = {
    safeAddress: SAFE,
    safeTxHash: stxh,
    safeTransactionData: safeTransaction.data,
    senderAddress: signer.address,
    senderSignature: sig.data,
    origin: signer.address
  };
  await safeService.proposeTransaction(transactionConfig);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});