import ethereumConfig from './json/ethereum-config.json';
import nearConfig from './json/near-config.json';
const nearAPI = require("near-api-js");
import BN from 'bn.js';

const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);

const Web3 = require('web3');
const web3 = new Web3(ethereumConfig.JsonRpc);
const Proof = require('./../src/generate-proof');

function getBridgedTokenAddress (erc20Address: string): string {
  return erc20Address.replace('0x', '').toLowerCase() +
      '.' + nearConfig.ConnectorAccount;
}

async function main(){
  let txHash: string = process.argv[2];
  const proof = await Proof.findProof(txHash, web3);
  console.log('Found proof for ', txHash);
  
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

  const bridgedToken = new nearAPI.Contract(
    account,
    getBridgedTokenAddress(ethereumConfig.TokenAddress),
    {
      viewMethods: ["get_balance"],
      changeMethods: []
    }
  )
  console.log("Bridged token address: ", getBridgedTokenAddress(ethereumConfig.TokenAddress));

  const initialBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Balance before the transfer: ", initialBalance);
  await connector.deposit(proof, val1, val2);
  const finalBalance = await bridgedToken.get_balance({ "owner_id": nearConfig.Account });
  console.log("Balance after the transfer: ", finalBalance);

}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);