import { describe, it, expect } from "vitest";
import AlgorandService from "./algorandService";

/**
 * Integration tests for finding real transactions in mainnet blocks
 *
 * ⚠️ IMPORTANT: These tests require network access to Algorand mainnet indexer
 * at https://mainnet-idx.4160.nodely.dev
 *
 * These tests verify that the implementation can correctly find inner transactions
 * in real Algorand mainnet blocks by:
 * 1. Fetching block data from the indexer
 * 2. Recursively searching through transactions and inner transactions
 * 3. Properly calculating transaction IDs with genesis parameters
 *
 * To run these tests in an environment with network restrictions, you may need to:
 * - Allow access to mainnet-idx.4160.nodely.dev
 * - Or run them in a production/staging environment
 * - Or skip them with: npm test -- --exclude="**\/*.integration.test.ts"
 */
describe("AlgorandService - Mainnet Integration Tests", () => {
  const service = new AlgorandService();

  // Test timeout increased to 30 seconds for network requests
  const TEST_TIMEOUT = 30000;

  describe("Finding specific transactions in mainnet blocks", () => {
    it(
      "should find transaction XYYJMSXLZSGZNOFGD3RNSHXKDRE7QDHYDGSVGHYMCBRZOWUDO42Q in block 55238557",
      async () => {
        const txId = "XYYJMSXLZSGZNOFGD3RNSHXKDRE7QDHYDGSVGHYMCBRZOWUDO42Q";
        const round = 55238557;

        const transaction = await service.getTransaction(txId, round);

        expect(transaction).toBeDefined();
        expect(transaction).not.toBeNull();
        if (transaction) {
          // Verify the transaction ID matches (either original or calculated)
          expect(transaction.id).toBe(txId);
          expect(transaction.confirmedRound).toBe(round);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should find transaction QKXHX3NDOOZ363NRL2MKGHEYRC6U7EXUH7POFFMZJHYUGN34ELOA in block 55239286",
      async () => {
        const txId = "QKXHX3NDOOZ363NRL2MKGHEYRC6U7EXUH7POFFMZJHYUGN34ELOA";
        const round = 55239286;

        const transaction = await service.getTransaction(txId, round);

        expect(transaction).toBeDefined();
        expect(transaction).not.toBeNull();
        if (transaction) {
          expect(transaction.id).toBe(txId);
          expect(transaction.confirmedRound).toBe(round);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should find transaction X2HOYJ4NETLTTYRKJTZM37QFOL5O23PTFVDHZCIE53LEPG3S34MQ in block 55239376",
      async () => {
        const txId = "X2HOYJ4NETLTTYRKJTZM37QFOL5O23PTFVDHZCIE53LEPG3S34MQ";
        const round = 55239376;

        const transaction = await service.getTransaction(txId, round);

        expect(transaction).toBeDefined();
        expect(transaction).not.toBeNull();
        if (transaction) {
          expect(transaction.id).toBe(txId);
          expect(transaction.confirmedRound).toBe(round);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should find transaction YKSMXVY4QLSZQAETYLDVJNXUOV5CT5DUENIN6R35YIWIY5YVUZTA in block 55239389",
      async () => {
        const txId = "YKSMXVY4QLSZQAETYLDVJNXUOV5CT5DUENIN6R35YIWIY5YVUZTA";
        const round = 55239389;

        const transaction = await service.getTransaction(txId, round);

        expect(transaction).toBeDefined();
        expect(transaction).not.toBeNull();
        if (transaction) {
          expect(transaction.id).toBe(txId);
          expect(transaction.confirmedRound).toBe(round);
        }
      },
      TEST_TIMEOUT
    );
  });

  describe("Block data retrieval", () => {
    it(
      "should successfully fetch block header from mainnet",
      async () => {
        const round = 55238557;
        const blockHeader = await service.getBlock(BigInt(round));

        expect(blockHeader).toBeDefined();
        expect(blockHeader).not.toBeNull();
        if (blockHeader) {
          expect(blockHeader.genesisID).toBeDefined();
          expect(blockHeader.genesisHash).toBeDefined();
          expect(blockHeader.genesisHash?.length).toBe(32);
        }
      },
      TEST_TIMEOUT
    );

    it(
      "should successfully fetch transactions from a block",
      async () => {
        const round = 55238557;
        const transactions = await service.getBlockTransactions(BigInt(round));

        expect(transactions).toBeDefined();
        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBeGreaterThan(0);
      },
      TEST_TIMEOUT
    );
  });
});
