import nearConfig from "./json/near-config.json";
import BN from "bn.js";

async function deployToken(address: string): Promise<string> {
  const nearAPI = require("near-api-js");
  const keyStore = new nearAPI.keyStores.UnencryptedFileSystemKeyStore(nearConfig.KeyStore);
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
    changeMethods: ["deploy_bridge_token"],
  });
  const attachedDeposit = new BN('3500000000000000000000000'); // 3.5 $NEAR
  const attachedGas = new BN('60000000000000'); //60 TGas
  console.log("Trying to deploy a token on NEAR:", address);
  await connector.deploy_bridge_token({"address": address.replace("0x", "")}, attachedGas, attachedDeposit);

  const bridgedTokenAddress: string = (await connector.get_bridge_token_account_id({"address": address.replace("0x", "")})).toString();
  console.log("Bridged token address is", bridgedTokenAddress);
  return bridgedTokenAddress;
}

exports.deployToken = deployToken;