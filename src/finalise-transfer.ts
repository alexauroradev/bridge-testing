import ethereumConfig from './json/ethereum-config.json';
import nearConfig from './json/near-config.json';
const nearAPI = require("near-api-js");
//import { Contract, keyStores, WalletConnection, Near, Connection, Account } from 'near-api-js'
import { KeyStore } from 'near-api-js/lib/key_stores';
import BN from 'bn.js'
/*
const near = new Near({
  keyStore: new keyStores.UnencryptedFileSystemKeyStore('~/.near-config'), //need to be logged in
  networkId: nearConfig.Network,
  nodeUrl: nearConfig.JsonRpc
})
*/

//const signerAccountId = "YOUR_ACCOUNT.testnet";
//const contractName = "dev-1598612260611-8955814";

const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(
    "/Users/alexshevchenko/.near-credentials/"
);


const Web3 = require('web3')
const web3 = new Web3(ethereumConfig.JsonRpc);
const Proof = require('./../src/generate-proof');

function getBridgedTokenAddress (erc20Address: string): string {
  return erc20Address.replace('0x', '').toLowerCase() +
      '.' + nearConfig.ConnectorAccount
}

async function main(){
  let txHash: string = process.argv[2];
  const proof = await Proof.findProof(txHash, web3);
  console.log('Found proof for ', txHash, ':');
  console.log(proof.toString('hex'));
  console.log('----------------------------------------------------------------------');
  
  const near = await nearAPI.connect({
    deps: {
      keyStore,
    },
    nodeUrl: nearConfig.JsonRpc,
    networkId: nearConfig.Network
  });

  const account = await near.account(nearConfig.Account);
  const val1 = new BN('300000000000000');
  const val2 = new BN('100000000000000000000').mul(new BN('600'));

  const connector = new nearAPI.Contract(
    account,
    nearConfig.ConnectorAccount,
    {
      viewMethods: [],
      changeMethods: ["deposit"]
    }
  );
  const result = await connector.deposit(proof, val1, val2);
  console.log(result);
/*
  const functionCallResponse = await account.functionCall(
    nearConfig.ConnectorAccount,
    "deposit",
    {
      proof,
      val1,
      val2
    }
  );

  const result = nearAPI.providers.getTransactionLastResult(
    functionCallResponse
  );
  console.log(result);
*/



  /*
  const nearConnection = Connection.fromConfig(near);
  const account = new Account(nearConnection, nearConfig.Account);
  const nearFungibleTokenFactory = new Contract(
    account,
    nearConfig.ConnectorAccount,
    {
      // Change methods update contract state, but cannot return data
      viewMethods: [],
      changeMethods: ['deposit', 'deploy_bridge_token']
    }
  )
  getBridgedTokenAddress(ethereumConfig.TokenAddress);


  nearFungibleTokenFactory.deposit(
    proof,
    new BN('300000000000000'),
    new BN('100000000000000000000').mul(new BN('600')
    );
    */
}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);