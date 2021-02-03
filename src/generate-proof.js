const Tree = require('merkle-patricia-tree') 
const { encode } = require('eth-util-lite') 
const { Header, Proof, Receipt, Log } = require('eth-object') 
const { promisfy } = require('promisfy') 
const utils = require('ethereumjs-util') 
const { serialize: serializeBorsh } = require('near-api-js/lib/utils/serialize') 
const Web3 = require('web3')
const ethereumConfig = require('./json/ethereum-config.json')
const connectorAbi = require('./json/connector.json')

const web3 = new Web3(ethereumConfig.JsonRpc);
const ethTokenLocker = new web3.eth.Contract(connectorAbi, ethereumConfig.ConnectorAddress); //, {from: ethereumConfig.Address}

class BorshProof {
  constructor (proof) {
    Object.assign(this, proof)
  }
}

const proofBorshSchema = new Map([
  [BorshProof, {
    kind: 'struct',
    fields: [
      ['log_index', 'u64'],
      ['log_entry_data', ['u8']],
      ['receipt_index', 'u64'],
      ['receipt_data', ['u8']],
      ['header_data', ['u8']],
      ['proof', [['u8']]]
    ]
  }]
])

// Compute proof that Locked event was fired in Ethereum. This proof can then
// be passed to the FungibleTokenFactory contract, which verifies the proof
// against a Prover contract.
async function findProof (lockTxHash) {
  const receipt = await web3.eth.getTransactionReceipt(lockTxHash)
  const block = await web3.eth.getBlock(receipt.blockNumber)
  const tree = await buildTree(block)
  const proof = await extractProof(
    block,
    tree,
    receipt.transactionIndex
  )

  const [lockedEvent] = await ethTokenLocker.getPastEvents('Locked', {
    filter: { transactionHash: lockTxHash },
    fromBlock: receipt.blockNumber
  })
  // `log.logIndex` does not necessarily match the log's order in the array of logs
  const logIndexInArray = receipt.logs.findIndex(
    l => l.logIndex === lockedEvent.logIndex
  )
  const log = receipt.logs[logIndexInArray]

  const formattedProof = new BorshProof({
    log_index: logIndexInArray,
    log_entry_data: Array.from(Log.fromWeb3(log).serialize()),
    receipt_index: proof.txIndex,
    receipt_data: Array.from(Receipt.fromWeb3(receipt).serialize()),
    header_data: Array.from(proof.header_rlp),
    proof: Array.from(proof.receiptProof).map(utils.rlp.encode).map(b => Array.from(b))
  })

  return serializeBorsh(proofBorshSchema, formattedProof)
}

async function buildTree (block) {
  const blockReceipts = await Promise.all(
    block.transactions.map(t => 
      web3.eth.getTransactionReceipt(t))
  )

  // Build a Patricia Merkle Trie
  const tree = new Tree()
  await Promise.all(
    blockReceipts.map(receipt => {
      const path = encode(receipt.transactionIndex)
      const serializedReceipt = Receipt.fromWeb3(receipt).serialize()
      return promisfy(tree.put, tree)(path, serializedReceipt)
    })
  )

  return tree
}

async function extractProof (block, tree, transactionIndex) {
  const [, , stack] = await promisfy(
    tree.findPath,
    tree
  )(encode(transactionIndex))

  const blockData = await web3.eth.getBlock(block.number)
  // Correctly compose and encode the header.
  const header = Header.fromWeb3(blockData)
  return {
    header_rlp: header.serialize(),
    receiptProof: Proof.fromStack(stack),
    txIndex: transactionIndex
  }
}

async function main(){
  let txHash = process.argv[2];
  
  console.log('Finding proof for ', txHash);
  const proof = await findProof(txHash, web3);
  //console.log(proof.toString('hex'));
  console.log(proof);
}

main().then(
  text => {
      console.log(text);
  },
  err => {
      console.log(err);
  }
);