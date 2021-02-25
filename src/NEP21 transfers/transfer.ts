import config from "./config.json";
import BN from "bn.js";

// NEAR keystore init
const nearAPI = require("near-api-js");
const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(config.KeyStore);

async function main() {  
  console.log("Starting a transfer of", config.TransferAmount, "bridged tokens", config.TokenAccount, "to", config.Recipient);
  console.log("--------------------------------------------------------------------------------")
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: config.JsonRpc,
    networkId: config.Network,
  });
  const account = await near.account(config.Account);
  const connector = new nearAPI.Contract(account, config.ConnectorAccount, {
    viewMethods: ["get_bridge_token_account_id"],
    changeMethods: [],
  });
  const bridgedTokenAccount = await connector.get_bridge_token_account_id({
    address: config.TokenAccount.replace("0x", ""),
  });
  console.log("Bridged token address is", bridgedTokenAccount);

  const bridgedToken = new nearAPI.Contract(account, bridgedTokenAccount,
    {
      viewMethods: ["get_balance"],
      changeMethods: ["transfer"],
    }
  );
  
  // Initial balances
  const initialBalanceSender = await bridgedToken.get_balance({
    owner_id: config.Account,
  });
  console.log("Bridged token balance of", config.Account, "(sender) before the transfer:", initialBalanceSender);
  const initialBalanceRecipient = await bridgedToken.get_balance({
    owner_id: config.Recipient,
  });
  console.log("Bridged token balance of", config.Recipient, "(recipient) before the transfer:", initialBalanceRecipient);


  const transferTx = await account.functionCall(
    bridgedTokenAccount,
    "transfer",
    {
      new_owner_id: config.Recipient,
      amount: config.TransferAmount,
    },
    new BN("3" + "0".repeat(14)) // Maximum gas limit
  );
  
  if (transferTx.status.Failure) {
    console.log("Because of some reason transaction was not applied as expected");
    return;
  } else {
    console.log("Transfer transaction succeeded:", transferTx.transaction.hash);
  }

  // Final balances
  const finalBalanceSender = await bridgedToken.get_balance({
    owner_id: config.Account,
  });
  console.log("Bridged token balance of", config.Account, "(sender) before the transfer:", finalBalanceSender);
  const finalBalanceRecipient = await bridgedToken.get_balance({
    owner_id: config.Recipient,
  });
  console.log("Bridged token balance of", config.Recipient, "(recipient) before the transfer:", finalBalanceRecipient);

}

main().then(
  (text) => {
  },
  (err) => {
    console.log(err);
  }
);
