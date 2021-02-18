import ethereumConfig from './json/ethereum-config.json';
import nearConfig from './json/near-config.json';
import BN from 'bn.js';
const Web3 = require('web3');
const web3 = new Web3(ethereumConfig.JsonRpc);

// NEAR keystore init
const nearAPI = require("near-api-js");
const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);

// A script that generates proofs of Ethereum events from locking transactions
const Proof = require('./../src/generate-proof');

const DeployToken = require('./deploy-token');

async function main(){
  if (process.argv.length != 3) {
    console.log("Incorrect usage of the script. Please call:");
    console.log("$ node", process.argv[1], "<locking transaction hash>");
    return;
  }
  let txHash: string = process.argv[2];
  console.log("Finalising deposit, that was started in Ethereum transaction", txHash);
  console.log("--------------------------------------------------------------------------------")
  
  // TODO: check that this script works as expected
  const proof = await Proof.findProof(txHash, web3);
  console.log("The proof was successfully found");
  
  // Init NEAR API
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network
  });

  const account = await near.account(nearConfig.Account);

  const connector = new nearAPI.Contract(
    account,
    nearConfig.ConnectorAccount,
    {
      viewMethods: ["get_bridge_token_account_id"],
      changeMethods: ["deposit"]
    }
  );
  
  // Querry bridged token address
  let bridgedTokenAddress: string = '';
  try {
    bridgedTokenAddress = (await connector.get_bridge_token_account_id({"address": ethereumConfig.TokenAddress.replace("0x", "")})).toString();
    console.log("Bridged token address is", bridgedTokenAddress);
  } catch (e) {
    console.log("The token was not deployed previously");
    bridgedTokenAddress = await DeployToken.deployToken(ethereumConfig.TokenAddress);
  }
  if (bridgedTokenAddress.length == 0) {
    throw('The problem with deploying token occured')
  }

  const bridgedToken = new nearAPI.Contract(
    account,
    bridgedTokenAddress,
    {
      viewMethods: ["get_balance"],
      changeMethods: []
    }
  )

  const initialBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Bridged token balance of", nearConfig.Account, "before finalisation of the deposit:", initialBalance);
  
  const val1 = new BN('300000000000000'); // Gas limit
  const val2 = new BN('100000000000000000000').mul(new BN('600')); // Attached payment to pay for the storage
  await connector.deposit(proof, val1, val2);
  
  const finalBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Bridged token balance of", nearConfig.Account, "after finalisation of the deposit: ", finalBalance);
}

main().then(
  text => {
  },
  err => {
      console.log(err);
  }
);