import ethereumConfig from "./json/ethereum-config.json";
import nearConfig from "./json/near-config.json";
import BN from "bn.js";

// NEAR keystore init
const nearAPI = require("near-api-js");
const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);

async function main() {
  console.log("Starting withdrawal of", nearConfig.WithdrawAmount, "bridged tokens", ethereumConfig.TokenAddress);
  console.log("--------------------------------------------------------------------------------")
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

  const bridgedTokenAddress = await connector.get_bridge_token_account_id({
    address: ethereumConfig.TokenAddress.replace("0x", ""),
  });
  console.log("Bridged token address is", bridgedTokenAddress);

  const bridgedToken = new nearAPI.Contract(account, bridgedTokenAddress,
    {
      viewMethods: ["get_balance"],
      changeMethods: ["withdraw"],
    }
  );
  const initialBalance = await bridgedToken.get_balance({
    owner_id: nearConfig.Account,
  });
  console.log("Bridged token balance of", nearConfig.Account, "before the withdraw:", initialBalance);

  const withdrawTx = await account.functionCall(
    bridgedTokenAddress,
    "withdraw",
    {
      amount: nearConfig.WithdrawAmount,
      recipient: ethereumConfig.Address.replace("0x", ""),
    },
    new BN("3" + "0".repeat(14)) // Maximum gas limit
  );
  
  if (withdrawTx.status.Failure) {
    console.log("Because of some reason transaction was not applied as expected");
    return;
  } else {
    console.log("Withdraw transaction succeeded:", withdrawTx.transaction.hash);
  }

  // Finding the execution outcome that would be used to proove withdraw on the Ethereum side
  const receiptIds = withdrawTx.transaction_outcome.outcome.receipt_ids;
  const txReceiptId = receiptIds[0];
  const successReceiptId = withdrawTx.receipts_outcome.find(
    (r) => r.id === txReceiptId
  ).outcome.status.SuccessReceiptId;
  console.log("The receipt of transaction execution outcome:", successReceiptId);
  console.log("This receipt should be used in the withdraw finalisation step");
  const txReceiptBlockHash = withdrawTx.receipts_outcome.find(
    (r) => r.id === successReceiptId
  ).block_hash;

  const receiptBlock = await account.connection.provider.block({
    blockId: txReceiptBlockHash,
  });

  const finalBalance = await bridgedToken.get_balance({
    owner_id: nearConfig.Account,
  });
  console.log("Bridged token balance of", nearConfig.Account, "after the withdraw: ", finalBalance);
  console.log(
    "Now you need to wait until NEAR Client on Ethereum will get a block with a height higher than",
    receiptBlock.header.height,
    "plus challenge period"
  );
}

main().then(
  (text) => {
  },
  (err) => {
    console.log(err);
  }
);
