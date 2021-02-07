import { ethers, Wallet } from "ethers";

import ethereumConfig from './json/ethereum-config.json';
import erc20Abi from './json/erc20.json';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const erc20 = new ethers.Contract(ethereumConfig.TokenAddress, erc20Abi, signer);

  const approveTx = await erc20.approve(ethereumConfig.ConnectorAddress, ethers.BigNumber.from(ethereumConfig.TransferAmount));
  console.log(approveTx);
}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);
