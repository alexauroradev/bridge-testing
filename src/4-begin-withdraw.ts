import ethereumConfig from "./json/ethereum-config.json";
import nearConfig from "./json/near-config.json";
const nearAPI = require("near-api-js");
import BN from "bn.js";

const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(
  nearConfig.KeyStore
);

async function main() {
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network,
  });

  const account = await near.account(nearConfig.Account);

  const connector = new nearAPI.Contract(account, nearConfig.ConnectorAccount, {
    viewMethods: ["get_bridge_token_account_id"],
    changeMethods: [],
  });

  const bridgeTokenAddress = await connector.get_bridge_token_account_id({
    address: ethereumConfig.TokenAddress.replace("0x", ""),
  });
  console.log("Bridged token address: ", bridgeTokenAddress);

  const bridgedToken = new nearAPI.Contract(account, bridgeTokenAddress, {
    viewMethods: ["get_balance"],
    changeMethods: ["withdraw"],
  });
  const initialBalance = await bridgedToken.get_balance({
    owner_id: nearConfig.Account,
  });
  console.log("Balance before the withdraw: ", initialBalance);

  const withdrawTx = await account.functionCall(
    bridgeTokenAddress,
    "withdraw",
    {
      amount: nearConfig.WithdrawAmount,
      recipient: ethereumConfig.Address.replace("0x", ""),
    },
    new BN("3" + "0".repeat(14)) //maximum gas
  );

  if (withdrawTx.status.Failure) {
    console.log("Transaction failed");
  } else {
    console.log("Thansaction succeeded");
  }

  const receiptIds = withdrawTx.transaction_outcome.outcome.receipt_ids;
  const txReceiptId = receiptIds[0];

  const successReceiptId = withdrawTx.receipts_outcome.find(
    (r) => r.id === txReceiptId
  ).outcome.status.SuccessReceiptId;
  console.log("Receipt ID: ", successReceiptId);
  const txReceiptBlockHash = withdrawTx.receipts_outcome.find(
    (r) => r.id === successReceiptId
  ).block_hash;

  const receiptBlock = await account.connection.provider.block({
    blockId: txReceiptBlockHash,
  });
  console.log("Block height:", receiptBlock.header.height);

  const finalBalance = await bridgedToken.get_balance({
    owner_id: nearConfig.Account,
  });
  console.log("Balance after the withdraw: ", finalBalance);
  console.log(
    "Now you need to wait until NEAR Client on Ethereum will get a block with a height higher than ",
    receiptBlock.header.height,
    " plus security period (5 minutes for Ropsten)"
  );
}

main().then(
  (text) => {
    console.log(text);
  },
  (err) => {
    console.log(err);
  }
);
