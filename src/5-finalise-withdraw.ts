import { ethers } from "ethers";
import bs58 from "bs58";
import ethereumConfig from "./json/ethereum-config.json";
import connectorAbi from "./json/connector.json";
import nearConfig from "./json/near-config.json";
import erc20Abi from './json/erc20.json';
import clientAbi from "./json/client.json";
import { toBuffer } from "eth-util-lite";

import {borshifyOutcomeProof} from "../src/borshify-proof";

const nearAPI = require("near-api-js");
const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(
  nearConfig.KeyStore
);

async function main() {
  let receiptId: string = process.argv[2];
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const erc20 = new ethers.Contract(ethereumConfig.TokenAddress, erc20Abi, signer);
  const connector = new ethers.Contract(
    ethereumConfig.ConnectorAddress,
    connectorAbi,
    signer
  );
  const client = new ethers.Contract(
    ethereumConfig.ClientAddress,
    clientAbi,
    signer
  );
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network,
  });

  const account = await near.account(nearConfig.Account);

  //----------------
  const clientHeight = Number((await client.bridgeState()).currentHeight);
  console.log("Current NEAR client height: ", clientHeight);

  const clientBlockHashB58 = bs58.encode(
    toBuffer(await client.blockHashes(clientHeight))
  );
  console.log("clientBlockHashB58: ", clientBlockHashB58);
  const initialAmount = (await erc20.balanceOf(ethereumConfig.Address)).toString();
  console.log("Amount of tokens on Ethereum account before the withdraw: ", initialAmount);
  let proof: any;
  try {
    proof = await account.connection.provider.sendJsonRpc(
      "light_client_proof",
      {
        type: "receipt",
        receipt_id: receiptId,
        receiver_id: nearConfig.Account,
        light_client_head: clientBlockHashB58,
      }
    );
  } catch (e) {
    console.log(e.message);
    return;
  }
  //console.log(proof);

  const borshProof = borshifyOutcomeProof(proof);
  const lockTx = await connector.unlockToken(borshProof, clientHeight);
  console.log(lockTx);
  await provider.waitForTransaction(lockTx.hash);
  const finalAmount = (await erc20.balanceOf(ethereumConfig.Address)).toString();
  console.log("Amount of tokens on Ethereum account after the withdraw: ", finalAmount);
}

main().then(
  (text) => {
    console.log(text);
  },
  (err) => {
    console.log(err);
  }
);
