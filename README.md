# Rainbow bridge step-by-step testing

**Disclaimer**: Rainbow Bridge is a WIP project at the moment. Information in this repository might be outdated. Please, consider confirming the deployed contract addresses (and their ABIs) and Rainbow Bridge interfaces (see more [here](https://github.com/near/rainbow-bridge))

The steps below are for the Ropsten testnet, same steps might be reproduced for other testnets and mainnet.

## Bridge deploymnets

| Bridge Description              | Status      | Ethereum Connector Address                 | NEAR Connector Account |
-----------------------------------------------------------------------------------------------------------------------
| NEAR testnet - Ropsten testnet  | Deploying   | - | - |
| NEAR testnet - Rinkeby testnet  | [Syncing](https://explorer.testnet.near.org/accounts/eth2near.bridge05.testnet) | - | - | 
| NEAR mainnet - Ethereum mainnet | [Stopped](https://github.com/near/rainbow-bridge/issues/455) | - | - |

## Preliminary steps (tested on iOS Big Sur)

1. Make sure you have installed npm
2. Install TypeScript: `sudo npm install typescript`
3. Install Ethers.js: `sudo npm install ethers`
4. Clone this repo: `git clone git@github.com:djsatok/bridge-testing.git` OR `git clone https://github.com/djsatok/bridge-testing.git`
6. Create an account in Metamask in Ropsten testnet.
7. Get some Ropsten ETH. For example using this faucet: https://faucet.ropsten.be/
8. Get some Ropsten ERC-20 tokens. For example, this can be done using etherscan frontend with this (TST token)[https://github.com/uzyn/ERC20-TST]: https://ropsten.etherscan.io/address/0x722dd3f80bac40c951b51bdd28dd19d435762180#writeContract . Use `showMeTheMoney` method, you will be asked to login with Metamask to send the transaction.
9. Rename `test-ethereum-config.json`  to `ethereum-config.json` in `bridge-testing/src/json`. Update `ethereum-config.json` with the actual data on the addresses, private key and transfer amount.
10. Compile JavaScript code from TypeScript: call `tsc` in `bridge-testing` folder. As a result `dist` folder should be populated with `.js` files and a copy of `json` folder.


## Ethereum to NEAR transfer
1. **Approve transaction**. Send an `approve` transaction to ERC20 contract. This step implies setting an alowance for a connector contract, so it can withdraw the tokens from your account. Arguments that you should use for this transaction: `ConnectorAddress` and `TransferAmount`. A sample script that implement this transaction send is `src/erc20-approve.ts`. To run it use the following CLI comand: `node dist/erc20-approve.js`.
2. **[UNTESTED] Locking transaction**. Send a `lock` transaction to `TokenLocker` contract. This step implies locking of a `TransferAmount` tokens in a locking contract, while specifying the NEAR `AccountID`, where bridged tokens should be transferred. Locking method emits an event, which will be used later to proove the fact of locking of funds. See the implementation [here](https://github.com/near/rainbow-token-connector/blob/master/erc20-connector/contracts/ERC20Locker.sol#L32-L35).
3. **Wait** for 25 confirmations in the Ethereum blockchain. This is needed to achieve finality of Ethereum block, including locking transaction.
4. **[TODO] Create proof**. Create an event proof with Rainbow Bridge CLI or a script (see example [here](https://github.com/near/rainbow-bridge-frontend/blob/master/src/js/transfers/erc20%2Bnep21/natural-erc20-to-nep21/findProof.js)).
5. **[TODO] Finalisation of the transfer**. Call minting transaction in NEAR blockchain.
