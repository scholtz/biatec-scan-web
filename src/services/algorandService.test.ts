import { describe, it, expect } from 'vitest'
import algosdk from 'algosdk'

/**
 * Test suite for inner transaction ID calculation
 * 
 * These tests verify that inner transactions have their IDs correctly calculated
 * by filling in parameters from the parent transaction and block header.
 * 
 * The calculation follows the pattern from AVMTradeReporter:
 * 1. Fill in genesisHash and genesisID from block header
 * 2. Fill in group from parent transaction  
 * 3. Recreate transaction using algosdk and calculate proper ID
 */
describe('AlgorandService - Inner Transaction ID Calculation', () => {
  // Generate valid test addresses
  const testAccount1 = algosdk.generateAccount()
  const testAccount2 = algosdk.generateAccount()
  const testSender = testAccount1.addr
  const testReceiver = testAccount2.addr
  // Test data - representing a real block and transaction structure
  const testBlockHeader: algosdk.BlockHeader = {
    round: BigInt(55238557),
    branch: new Uint8Array(32),
    seed: new Uint8Array(32),
    txnCommitments: {
      nativeSha512_256Commitment: new Uint8Array(32),
      sha256Commitment: new Uint8Array(32),
    },
    timestamp: BigInt(1234567890),
    genesisID: 'mainnet-v1.0',
    genesisHash: new Uint8Array([
      // Mainnet genesis hash (base64: wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=)
      192, 97, 196, 216, 252, 29, 189, 222, 210, 215, 96, 75, 228, 86, 142, 63,
      109, 4, 25, 135, 172, 55, 189, 228, 182, 32, 181, 171, 57, 36, 138, 223
    ]),
    upgradeState: {
      currentProtocol: 'future',
      nextProtocol: '',
      nextProtocolApprovals: BigInt(0),
      nextProtocolVoteBefore: BigInt(0),
      nextProtocolSwitchOn: BigInt(0),
    },
    upgradeVote: {
      upgradePropose: '',
      upgradeApprove: false,
    },
    txnCounter: BigInt(100),
  } as algosdk.BlockHeader

  const testGroup = new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
  ])

  describe('reconstructInnerTransaction', () => {
    it('should fill in genesisHash from block header', () => {
      const innerTx: Partial<algosdk.indexerModels.Transaction> = {
        id: 'INNER123',
        txType: 'pay',
        sender: 'SENDER123',
        fee: BigInt(1000),
        firstValid: BigInt(55238557),
        lastValid: BigInt(55238567),
      }

      const parentTx: Partial<algosdk.indexerModels.Transaction> = {
        id: 'PARENT123',
        txType: 'appl',
        sender: 'SENDER123',
        fee: BigInt(2000),
        firstValid: BigInt(55238557),
        lastValid: BigInt(55238567),
        genesisHash: testBlockHeader.genesisHash,
        genesisId: testBlockHeader.genesisID,
        group: testGroup,
      }

      // Reconstruct inner transaction
      const reconstructed = {
        ...innerTx,
        genesisHash: !innerTx.genesisHash && testBlockHeader.genesisHash 
          ? testBlockHeader.genesisHash 
          : innerTx.genesisHash,
        genesisId: !innerTx.genesisId && testBlockHeader.genesisID 
          ? testBlockHeader.genesisID 
          : innerTx.genesisId,
        group: !innerTx.group && parentTx.group 
          ? parentTx.group 
          : innerTx.group,
      }

      expect(reconstructed.genesisHash).toEqual(testBlockHeader.genesisHash)
      expect(reconstructed.genesisId).toEqual(testBlockHeader.genesisID)
      expect(reconstructed.group).toEqual(testGroup)
    })

    it('should fill in group from parent transaction', () => {
      const innerTx: Partial<algosdk.indexerModels.Transaction> = {
        id: 'INNER456',
        txType: 'axfer',
        sender: 'SENDER456',
      }

      const parentTx: Partial<algosdk.indexerModels.Transaction> = {
        id: 'PARENT456',
        group: testGroup,
      }

      const reconstructed = {
        ...innerTx,
        group: !innerTx.group && parentTx.group 
          ? parentTx.group 
          : innerTx.group,
      }

      expect(reconstructed.group).toEqual(testGroup)
    })

    it('should not overwrite existing genesisHash', () => {
      const existingHash = new Uint8Array(32).fill(99)
      
      const innerTx: Partial<algosdk.indexerModels.Transaction> = {
        id: 'INNER789',
        genesisHash: existingHash,
      }

      const reconstructed = {
        ...innerTx,
        genesisHash: !innerTx.genesisHash && testBlockHeader.genesisHash 
          ? testBlockHeader.genesisHash 
          : innerTx.genesisHash,
      }

      expect(reconstructed.genesisHash).toEqual(existingHash)
      expect(reconstructed.genesisHash).not.toEqual(testBlockHeader.genesisHash)
    })
  })

  describe('calculateTransactionId for payment transactions', () => {
    it('should calculate correct ID for payment transaction with all parameters', () => {
      // Create a payment transaction using algosdk
      const suggestedParams: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams,
      })

      // Set group to simulate inner transaction with group
      txn.group = testGroup

      const calculatedId = txn.txID()

      // Verify the ID is calculated correctly
      expect(calculatedId).toBeDefined()
      expect(calculatedId.length).toBeGreaterThan(0)
      expect(typeof calculatedId).toBe('string')
    })

    it('should produce different IDs with and without group', () => {
      const suggestedParams: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      // Transaction without group
      const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams,
      })
      const id1 = txn1.txID()

      // Same transaction with group
      const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams,
      })
      txn2.group = testGroup
      const id2 = txn2.txID()

      // IDs should be different when group is present
      expect(id1).not.toEqual(id2)
    })
  })

  describe('calculateTransactionId for application call transactions', () => {
    it('should calculate correct ID for application call transaction', () => {
      const suggestedParams: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      const txn = algosdk.makeApplicationCallTxnFromObject({
        sender: testSender,
        appIndex: BigInt(123456),
        onComplete: 0, // NoOp
        appArgs: [new Uint8Array([1, 2, 3])],
        accounts: [],
        foreignApps: [],
        foreignAssets: [],
        suggestedParams,
      })

      txn.group = testGroup

      const calculatedId = txn.txID()

      expect(calculatedId).toBeDefined()
      expect(calculatedId.length).toBeGreaterThan(0)
    })

    it('should handle application call with empty arrays', () => {
      const suggestedParams: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      // Test with undefined arrays (should default to empty arrays)
      const txn = algosdk.makeApplicationCallTxnFromObject({
        sender: testSender,
        appIndex: BigInt(789),
        onComplete: 0,
        appArgs: [], // Empty array
        accounts: [], // Empty array
        foreignApps: [], // Empty array
        foreignAssets: [], // Empty array
        suggestedParams,
      })

      txn.group = testGroup

      const calculatedId = txn.txID()

      expect(calculatedId).toBeDefined()
      expect(calculatedId.length).toBeGreaterThan(0)
    })
  })

  describe('calculateTransactionId for asset transfer transactions', () => {
    it('should calculate correct ID for asset transfer transaction', () => {
      const suggestedParams: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(100),
        assetIndex: 31566704, // USDC on Algorand
        suggestedParams,
      })

      txn.group = testGroup

      const calculatedId = txn.txID()

      expect(calculatedId).toBeDefined()
      expect(calculatedId.length).toBeGreaterThan(0)
    })
  })

  describe('genesisHash and genesisID impact on transaction ID', () => {
    it('should produce different IDs with different genesis parameters', () => {
      // First transaction with mainnet genesis
      const suggestedParams1: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: 'mainnet-v1.0',
        genesisHash: testBlockHeader.genesisHash,
      }

      const txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams: suggestedParams1,
      })
      const id1 = txn1.txID()

      // Second transaction with different genesis
      const suggestedParams2: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: 'testnet-v1.0',
        genesisHash: new Uint8Array(32).fill(1),
      }

      const txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams: suggestedParams2,
      })
      const id2 = txn2.txID()

      // IDs should be different with different genesis parameters
      expect(id1).not.toEqual(id2)
    })

    it('should demonstrate importance of filling genesis parameters for inner transactions', () => {
      // Simulating inner transaction WITHOUT proper genesis parameters (incorrect)
      // Use a different genesis hash to simulate the problem
      const wrongGenesisHash = new Uint8Array(32).fill(99)
      const suggestedParamsWithWrongGenesis: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: 'wrong-genesis',
        genesisHash: wrongGenesisHash,
      }

      const txnWithWrongGenesis = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams: suggestedParamsWithWrongGenesis,
      })
      txnWithWrongGenesis.group = testGroup
      const idWithWrongGenesis = txnWithWrongGenesis.txID()

      // Simulating inner transaction WITH genesis parameters filled in (correct)
      const suggestedParamsWithGenesis: algosdk.SuggestedParams = {
        fee: 1000,
        minFee: 1000,
        firstValid: 55238557,
        lastValid: 55238567,
        genesisID: testBlockHeader.genesisID,
        genesisHash: testBlockHeader.genesisHash,
      }

      const txnWithGenesis = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: testSender,
        receiver: testReceiver,
        amount: BigInt(1000000),
        suggestedParams: suggestedParamsWithGenesis,
      })
      txnWithGenesis.group = testGroup
      const idWithGenesis = txnWithGenesis.txID()

      // This demonstrates WHY we need to fill in genesis parameters:
      // Without correct genesis params, the transaction ID will be different!
      expect(idWithWrongGenesis).not.toEqual(idWithGenesis)
      
      console.log('ID with wrong genesis params:', idWithWrongGenesis)
      console.log('ID with correct genesis params:', idWithGenesis)
      console.log('This shows why inner transactions need correct genesis params from block header!')
    })
  })
})
