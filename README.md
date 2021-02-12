# Rainbow bridge step-by-step testing

**Disclaimer**: Rainbow Bridge is a WIP project at the moment. Information in this repository might be outdated. Please, consider confirming the deployed contract addresses (and their ABIs) and Rainbow Bridge interfaces (see more [here](https://github.com/near/rainbow-bridge))

The steps below are for the Ropsten testnet, same steps might be reproduced for other testnets and mainnet.

## Bridge deploymnets

| Bridge Description              | Status      | Ethereum Connector Address                 | NEAR Connector Account |
|---------------------------------|-------------|--------------------------------------------|------------------------|
| NEAR testnet - Ropsten testnet  | [Working](https://explorer.testnet.near.org/accounts/ropsten.testnet)   | 0xa5289b6d5dcc13e48f2cc6382256e51589849f86 | f290121.ropsten.testnet |
| NEAR testnet - Rinkeby testnet  | [Working](https://explorer.testnet.near.org/accounts/rinkeby.testnet) | 0x6381a3bad6b51988497dc588496ad1177d1650ea | f030221.rinkeby.testnet | 
| NEAR mainnet - Ethereum mainnet | Stopped | - | - |

## Preliminary steps (tested on iOS Big Sur)

1. Make sure you have installed npm
2. Install NEAR CLI: `$ npm install -g near-cli`
3. Install TypeScript: `$ npm install -g typescript`
4. Clone this repo: `$ git clone git@github.com:djsatok/bridge-testing.git` OR `$ git clone https://github.com/djsatok/bridge-testing.git`
5. `$ cd bridge-testing` & `$ npm install`.
6. Create an account in Metamask in Ropsten testnet.
7. Get some Ropsten ETH. For example using this faucet: https://faucet.ropsten.be/
8. Get some Ropsten ERC-20 tokens. For example, this can be done using etherscan frontend with this [TST token](https://github.com/uzyn/ERC20-TST): https://ropsten.etherscan.io/address/0x722dd3f80bac40c951b51bdd28dd19d435762180#writeContract . Use `showMeTheMoney` method, you will be asked to login with Metamask to send the transaction. **TODO:** Scripts at the moment are working only with tokens *deployed* on NEAR side. Tokens can be deployed over the bridge using the [`deploy_bridge_token`](https://github.com/near/rainbow-token-connector/blob/master/bridge-token-factory/src/lib.rs#L238-L266) method. TST token is already deployed, so usable.
9. Create an account in NEAR TestNet: https://wallet.testnet.near.org/
10. Make sure that you're working with the NEAR TestNet: `$ export NODE_ENV=testnet`
11. Log in to the NEAR Wallet from the CLI: `$ near login`. The browser should pop up and a NEAR Wallet should ask for a permission for adding a full access key.
12. Rename `test-ethereum-config.json` to `ethereum-config.json` in `bridge-testing/src/json`. Update `ethereum-config.json` with the actual data on the addresses, private key and transfer amount. RPC access can be easily gained from [Alchemy](https://www.alchemyapi.io/).
13. Rename `test-near-config.json` to `near-config.json` in `bridge-testing/src/json`. Update `near-config.json` with the actual data on the addresses and KeyStore
14. Compile JavaScript code from TypeScript: call `$ tsc` in `bridge-testing` folder. As a result `build` folder should be populated with `.js` files and a copy of `json` folder.


## Ethereum to NEAR transfer
1. **Approve transaction**. Send an `approve` transaction to ERC20 contract. This step implies setting an alowance for a connector contract, so it can withdraw the tokens from your account. Arguments that you should use for this transaction: `ConnectorAddress` and `TransferAmount`. A sample script that implements sending this transaction is `src/1-erc20-approve.ts`. To run it use the following comand: `$ node build/1-erc20-approve.js`.
2. **Locking transaction**. Send a `lock` transaction to `TokenLocker` contract. This step implies locking of a `TransferAmount` tokens in a locking contract, while specifying the NEAR `AccountID`, where bridged tokens should be transferred. Locking method emits an event, which will be used later to proove the fact of locking of funds. See the implementation [here](https://github.com/near/rainbow-token-connector/blob/master/erc20-connector/contracts/ERC20Locker.sol#L32-L35). A sample script that implements sending this transaction is `src/2-connector-lock.ts`. To run it use the following CLI command: `$ node build/2-connector-lock.js`.
3. **Wait sufficiently long**. 30 confirmations for Ropsten blockchain. This is needed to achieve finality of Ropsten block, including locking transaction. The status of syncing of the bridge can be observed [here](http://35.235.76.186:8002/metrics). First metric (`near_bridge_eth2near_client_block_number`) should become more than the height of a block with transaction from the step 2 at least by 30, for successfull finalisation of the transfer.
4. **Finalisation of the transfer**. Call minting transaction in NEAR blockchain. This step implies calling a `deposit` method of the NEAR token factory contract. The method consumes [Borsh](https://github.com/near/borsh)-ified proof of the event, emitted during the step 2 transaction execution. The script that implements proof calculation is located at `src/generate-proof.js`, while the finalisation script is located at `src/3-finalise-deposit.ts`. To perform this step, find in the output of the step 2 a hash of the locking transaction, then use the following CLI command `$ node build/3-finalise-deposit.js <TransactionHash>`.

## NEAR to Ethereum transfer
1. **Begin withdraw**. Send a `withdraw` transaction to the bridged token contract. During the execution, a token factory contract will be called and issue an execution outcome, which would be used during finalisation step to contruct the proof for the locking contract in Ethereum. This step is implemented in `src/4-begin-withdraw.ts`. After the compilation to perform this step call: `$ node build/4-begin-withdraw.js`.
2. **Wait sufficiently long**. This approximately takes 10 minutes for the Ropsten bridge deployment. This is needed to relay NEAR block with the height higher than the block with transaction from previous step to Ethereum, plus wait a challenge period. The status of syncing of the bridge can be observed [here](http://35.235.76.186:8001/metrics). First metric `near_bridge_near2eth_client_height` should become higher than the block height displayed in console during the previous step.
3. **Finalise withdraw**. Send an `unlock` transaction to the locking contract. After bridge syncing we are able to prove the fact of withdrawal transaction on NEAR to the locking contract. Script `src/5-finalise-withdraw.ts` implements calculation of the correspondent proof (with the help of `src/borshify-proof.js`) and sends this proof in the locking contract. To perform this step, find in the output of the step 1 a receipt of the execution outcome, then use the following CLI command `$ node build/4-finalise-withdraw.js <Receipt>`.