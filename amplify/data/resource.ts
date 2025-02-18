import { defineResource } from "@aws-amplify/cli-extensibility-helper";

/**
 * UserStats table
 */
export const userStats = defineResource(() => {
	return {
		Type: "AWS::DynamoDB::Table",
		Properties: {
			TableName: "UserStats",
			KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
			AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
			StreamSpecification: {
				StreamViewType: "NEW_AND_OLD_IMAGES",
			},
			TimeToLiveSpecification: {
				AttributeName: "expiresAt",
				Enabled: false,
			},
			BillingMode: "PAY_PER_REQUEST",
		},
	};
});

/**
 * TokenUsage table
 */
export const tokenUsage = defineResource(() => {
	return {
		Type: "AWS::DynamoDB::Table",
		Properties: {
			TableName: "TokenUsage",
			KeySchema: [
				{ AttributeName: "userId", KeyType: "HASH" },
				{ AttributeName: "challengeId", KeyType: "RANGE" },
			],
			AttributeDefinitions: [
				{ AttributeName: "userId", AttributeType: "S" },
				{ AttributeName: "challengeId", AttributeType: "S" },
				{ AttributeName: "timestamp", AttributeType: "S" }, // for GSI
			],
			GlobalSecondaryIndexes: [
				{
					IndexName: "byTimestamp",
					KeySchema: [
						{ AttributeName: "userId", KeyType: "HASH" },
						{ AttributeName: "timestamp", KeyType: "RANGE" },
					],
					Projection: { ProjectionType: "ALL" },
				},
			],
			StreamSpecification: {
				StreamViewType: "NEW_AND_OLD_IMAGES",
			},
			TimeToLiveSpecification: {
				AttributeName: "expiresAt",
				Enabled: true,
			},
			BillingMode: "PAY_PER_REQUEST",
		},
	};
});

/**
 * MonthlyUsage table
 */
export const monthlyUsage = defineResource(() => {
	return {
		Type: "AWS::DynamoDB::Table",
		Properties: {
			TableName: "MonthlyUsage",
			KeySchema: [
				{ AttributeName: "userId", KeyType: "HASH" },
				{ AttributeName: "yearMonth", KeyType: "RANGE" },
			],
			AttributeDefinitions: [
				{ AttributeName: "userId", AttributeType: "S" },
				{ AttributeName: "yearMonth", AttributeType: "S" },
			],
			StreamSpecification: {
				StreamViewType: "NEW_AND_OLD_IMAGES",
			},
			TimeToLiveSpecification: {
				AttributeName: "expiresAt",
				Enabled: true,
			},
			BillingMode: "PAY_PER_REQUEST",
		},
	};
});
