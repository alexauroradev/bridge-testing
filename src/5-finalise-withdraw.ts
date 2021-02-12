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
  if (process.argv.length != 3) {
    console.log("Incorrect usage of the script. Please call:");
    console.log("$ node", process.argv[1], "<execution outcome>");
    return;
  }
  let receiptId: string = process.argv[2];
  console.log("Finalising withdraw of", nearConfig.WithdrawAmount, "tokens");
  console.log("--------------------------------------------------------------------------------")
  
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const erc20 = new ethers.Contract(ethereumConfig.TokenAddress, erc20Abi, signer);
  const connector = new ethers.Contract(ethereumConfig.ConnectorAddress, connectorAbi, signer);
  const client = new ethers.Contract(ethereumConfig.ClientAddress, clientAbi, signer);
  
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network,
  });
  const account = await near.account(nearConfig.Account);

  // Check current NEAR client height
  const clientHeight = Number((await client.bridgeState()).currentHeight);
  console.log("Current NEAR client height on Ethereum:", clientHeight);
  const clientBlockHashB58 = bs58.encode(
    toBuffer(await client.blockHashes(clientHeight))
  );

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
    console.log("NEAR client is not synced, please wait a bit more");
    return;
  }

  const borshProof = borshifyOutcomeProof(proof);
  const initialAmount = (await erc20.balanceOf(ethereumConfig.Address)).toString();
  console.log("Token balance of", ethereumConfig.Address, "before the withdraw:", initialAmount);
  
  // Unlocking transaction
  let unlockTx;
  try {
    unlockTx = await connector.unlockToken(borshProof, clientHeight);
  }
  catch (e) {
    console.log("Because of some reason transaction was not applied as expected. Perhaps the execution outcome was already used.");
    return;
  }
  if (!(await provider.waitForTransaction(unlockTx.hash)).status) {
    console.log("Because of some reason transaction was not applied as expected");
    return;
  }
  console.log("Unlocking transaction completed:", unlockTx.hash);

  const finalAmount = (await erc20.balanceOf(ethereumConfig.Address)).toString();
  console.log("Token balance of", ethereumConfig.Address, "after the withdraw:", finalAmount);
}

main().then(
  (text) => {
  },
  (err) => {
    console.log(err);
  }
);
