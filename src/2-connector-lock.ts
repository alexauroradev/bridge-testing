import { ethers } from "ethers";

import ethereumConfig from './json/ethereum-config.json';
import connectorAbi from './json/connector.json';
import nearConfig from './json/near-config.json';

async function main(){
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const connector = new ethers.Contract(ethereumConfig.ConnectorAddress, connectorAbi, signer);
  const lockTx = await connector.lockToken(ethereumConfig.TokenAddress, ethers.BigNumber.from(ethereumConfig.DepositAmount), nearConfig.Account);
  await provider.waitForTransaction(lockTx.hash);
  console.log(lockTx);
}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);
