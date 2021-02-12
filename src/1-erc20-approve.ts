import {ethers} from "ethers";
import BN from 'bn.js';
import ethereumConfig from './json/ethereum-config.json';
import erc20Abi from './json/erc20.json';

async function main() {
  const depositAmount = new BN(ethereumConfig.DepositAmount);
  console.log("Approving to Locker contract transfer of", depositAmount.toString(), "tokens");
  console.log("--------------------------------------------------------------------------------")
  
  // Initialising ethers
  const provider = new ethers.providers.JsonRpcProvider(ethereumConfig.JsonRpc);
  const signer = new ethers.Wallet(ethereumConfig.PrivateKey, provider);
  const erc20 = new ethers.Contract(ethereumConfig.TokenAddress, erc20Abi, signer);
  
  // Get already approved amount
  const initialApprovedAmount = new BN((await erc20.allowance(ethereumConfig.Address, ethereumConfig.ConnectorAddress)).toString());
  console.log("Initial approved amount of tokens:", initialApprovedAmount.toString());
  if (initialApprovedAmount >= depositAmount) {
    console.log("There's already sufficient amount of approved tokens, no need to schedule a transaction");
    return;
  }

  // Schedule 'approve' transaction
  const approveTx = await erc20.approve(ethereumConfig.ConnectorAddress, ethers.BigNumber.from(ethereumConfig.DepositAmount));
  if (!(await provider.waitForTransaction(approveTx.hash)).status){
    console.log("Because of some reason transaction was not applied as expected");
    return;
  }
  console.log("Approving transaction completed:", approveTx.hash);
  
  const finalApprovedAmount = new BN((await erc20.allowance(ethereumConfig.Address, ethereumConfig.ConnectorAddress)).toString());
  console.log("Resulting approved amount of tokens:", finalApprovedAmount.toString());
}

main().then(
  text => {
  },
  err => {
      console.log(err);
  }
);
