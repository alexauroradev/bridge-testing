# Rainbow bridge step-by-step testing

**Disclaimer**: Rainbow Bridge is a WIP project at the moment. Information in this repository might be outdated. Please, consider confirming the deployed contract addresses (and their ABIs) and Rainbow Bridge interfaces (see more [here](https://github.com/near/rainbow-bridge))

## Preliminary steps (tested on iOS Big Sur)

1. Install homebrew. See instructions here: https://brew.sh/
2. Get an access to Ethereum JSON-RPC:
  a. Create an account in [Infura](https://infura.io/) or [Alchemy](https://alchemyapi.io/). Free plans on both services would be enough. Both services will provide hhtp link that is to be used later in scripts (constructor of Web3 Provider) OR
  b. Install [geth](https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum) and run. Geth will provide IPC link (seek for something like `/Users/<User>/Library/Ethereum/geth.ipc` in console log) that is to be used later in scripts (constructor of Web3 provider).
3. Get private and public keys from Ethereum account.
  a. If the account was created in Metamask click Account Details -> Export private key
  b. One can also [create an Ethereum account through geth](https://geth.ethereum.org/docs/interface/managing-your-accounts#:~:text=The%20ethereum%20CLI%20geth%20provides,format%20and%20change%20your%20password.)
4. Install [NodeJS](https://nodejs.org/en/)
5. Execute `$ npm install web3` and `$ npm install ethereumjs-tx`

## Ethereum to NEAR transfer

1. Send an `approve` transaction to ERC20 contract of respective currency
2. Send a `lock` transaction to `TokenLocker` contract
3. Wait for 25 confirmations in the Ethereum blockchain
4. Create an event proof with Rainbow Bridge CLI
5. Call minting transaction in NEAR
