import {ethers} from "ethers";
import BN from 'bn.js';
import ethereumConfig from './json/ethereum-config.json';
import connectorAbi from './json/connector.json';
import nearConfig from './json/near-config.json';

async function main(){
  const depositAmount = new BN(ethereumConfig.DepositAmount);
  console.log("Locking", depositAmount.toString(), "tokens in fungible token connector");
  console.log("--------------------------------------------------------------------------------")
  
  // Initialising ethers
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const connector = new ethers.Contract(ethereumConfig.ConnectorAddress, connectorAbi, signer);

  // Schedule locking transaction
  const lockTx = await connector.lockToken(ethereumConfig.TokenAddress, ethers.BigNumber.from(ethereumConfig.DepositAmount), nearConfig.Account);
  if (!(await provider.waitForTransaction(lockTx.hash)).status) {
    console.log("Because of some reason transaction was not applied as expected");
    return;
  }
  console.log("Locking transaction completed:", lockTx.hash);
  console.log("Now you need to wait sufficient amount of time for the bridge to sync Ethereum chain on NEAR");
  console.log("Use hash of the locking transaction as an input to the next step");
}

main().then(
  text => {
  },
  err => {
      console.log(err);
  }
);
