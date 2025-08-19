export interface SubscriptionFilter {
  RecentBlocks: boolean;
  RecentTrades: boolean;
  RecentLiquidity: boolean;
  RecentPool: boolean;
  RecentAggregatedPool: boolean;

  MainAggregatedPools: boolean;

  PoolsAddresses: string[];
  AggregatedPoolsIds: string[];
}

export const createDashboardSubscriptionFilter = (): SubscriptionFilter => ({
  RecentBlocks: true,
  RecentTrades: true,
  RecentLiquidity: true,
  RecentPool: true,
  RecentAggregatedPool: true,
  MainAggregatedPools: true,

  PoolsAddresses: [],
  AggregatedPoolsIds: [],
});
