import { defineTable } from '@aws-amplify/cli-extensibility-helper';

export const userStats = defineTable({
  name: 'UserStats',
  partitionKey: {
    name: 'userId',
    type: 'string'
  },
  stream: true,
  ttl: {
    attributeName: 'expiresAt',
    enabled: false
  }
});

export const tokenUsage = defineTable({
  name: 'TokenUsage',
  partitionKey: {
    name: 'userId',
    type: 'string'
  },
  sortKey: {
    name: 'challengeId',
    type: 'string'
  },
  stream: true,
  ttl: {
    attributeName: 'expiresAt',
    enabled: true
  },
  globalSecondaryIndexes: [
    {
      indexName: 'byTimestamp',
      partitionKey: {
        name: 'userId',
        type: 'string'
      },
      sortKey: {
        name: 'timestamp',
        type: 'string'
      }
    }
  ]
});

export const monthlyUsage = defineTable({
  name: 'MonthlyUsage',
  partitionKey: {
    name: 'userId',
    type: 'string'
  },
  sortKey: {
    name: 'yearMonth',
    type: 'string'
  },
  stream: true,
  ttl: {
    attributeName: 'expiresAt',
    enabled: true
  }
});
