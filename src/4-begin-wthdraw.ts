import ethereumConfig from './json/ethereum-config.json';
import nearConfig from './json/near-config.json';
const nearAPI = require("near-api-js");
import BN from 'bn.js';

const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);

async function main(){
  //console.log('Found proof for ', txHash);
  
  const near = await nearAPI.connect({
    deps: {
      keyStore
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network
  });

  const account = await near.account(nearConfig.Account);
  //const val1 = new BN('300000000000000');
  //const val2 = new BN('100000000000000000000').mul(new BN('600'));

  const connector = new nearAPI.Contract(
    account,
    nearConfig.ConnectorAccount,
    {
      viewMethods: ["get_bridge_token_account_id"],
      changeMethods: []
    }
  );

  const bridgeTokenAddress = await connector.get_bridge_token_account_id({"address": ethereumConfig.TokenAddress.replace('0x', '')});
  console.log("Bridged token address: ", bridgeTokenAddress);

  const bridgedToken = new nearAPI.Contract(
    account,
    bridgeTokenAddress,
    {
      viewMethods: ["get_balance"],
      changeMethods: ["withdraw"]
    }
  )
  const initialBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Balance before the withdraw: ", initialBalance);

  const withdrawTx = await account.functionCall(
    bridgeTokenAddress,
    'withdraw',
    {
      "amount": ethereumConfig.TransferAmount,
      "recipient": ethereumConfig.Address.replace('0x', '')
    },
    new BN('3' + '0'.repeat(14)) //maximum gas
  ) 

  //Check the transaction status
  //console.log("Withdraw tx:");
  //console.log(withdrawTx);
  if (withdrawTx.status.Failure){
    console.log("Transaction failed");
  } else {
    console.log("Thansaction succeeded");
  }
  
  const receiptIds = withdrawTx.transaction_outcome.outcome.receipt_ids
  const txReceiptId = receiptIds[0];
  //console.log("Receipt (to be used in unlocking transaction): ", txReceiptId);
  
  const successReceiptId = withdrawTx.receipts_outcome
    .find(r => r.id === txReceiptId).outcome.status.SuccessReceiptId
  console.log("Receipt ID: ", successReceiptId);
  const txReceiptBlockHash = withdrawTx.receipts_outcome
    .find(r => r.id === successReceiptId).block_hash
  //console.log("Receipt block hash:", txReceiptBlockHash);

  const receiptBlock = await account.connection.provider.block({
    "blockId": txReceiptBlockHash
  })
  console.log("Block height:", receiptBlock.header.height);

  const finalBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Balance after the withdraw: ", finalBalance);
}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);