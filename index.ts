import {
  ConsumedCapacity,
  ListTablesCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { InitializeMiddleware, Pluggable } from "@aws-sdk/types";
import { RegionResolvedConfig } from "@smithy/config-resolver";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

function createLogConsumedCapacityMiddleware(
  minConsumedCapacityUnits: number
): InitializeMiddleware<ServiceInputTypes, ServiceOutputTypes> {
  return (next) => async (args) => {
    args.input = {
      ...args.input,
      ReturnConsumedCapacity: "TOTAL",
    };
    console.log("Middleware called with input:", args.input);

    const result = await next(args);

    const output = result.output as {
      ConsumedCapacity?: ConsumedCapacity | ConsumedCapacity[];
    };
    //  Add debug log for the result, you should be able to see ConsumedCapacity
    console.log("Received result:", output);

    const consumedCapacities = output.ConsumedCapacity
      ? Array.isArray(output.ConsumedCapacity)
        ? output.ConsumedCapacity
        : [output.ConsumedCapacity]
      : [];

    // Optional - Log all consumed capacities regardless of threshold
    // console.log("Consumed Capacities:", consumedCapacities);

    if (
      consumedCapacities.some(
        (consumedCapacity) =>
          (consumedCapacity.CapacityUnits ?? 0) >= minConsumedCapacityUnits
      )
    ) {
      console.log("High Capacity Usage Detected:", {
        consumedCapacity: output.ConsumedCapacity,
        input: args.input,
        threshold: minConsumedCapacityUnits,
      });
    }

    return result;
  };
}

export function createLogConsumedCapacityPlugin(
  region: string
): Pluggable<ServiceInputTypes, ServiceOutputTypes> {
  return {
    applyToStack: (stack) => {
      // Lower the threshold to see more logs
      const LOG_CONSUMED_CAPACITY = 2;

      console.log("Plugin initialized with threshold:", LOG_CONSUMED_CAPACITY);

      if (LOG_CONSUMED_CAPACITY) {
        stack.add(
          createLogConsumedCapacityMiddleware(LOG_CONSUMED_CAPACITY),
          {
            name: "logConsumedCapacityMiddleware",
             step: "serialize",
            // relation: "after",
            // toMiddleware: "DocumentMarshall",
          }
        );
        console.log("Middleware added to stack");
      }
    },
  };
}

async function testDynamoDB() {
  try {
    const ddb = new DynamoDBClient({});

    const ddbDocumentClient = DynamoDBDocumentClient.from(ddb);

    const plugin = createLogConsumedCapacityPlugin("us-east-1");
    ddbDocumentClient.middlewareStack.use(plugin);
    const command = new GetCommand({
      TableName: "test",
      Key: { testKey: "aaa" },

    });

    const result = await ddbDocumentClient.send(command);

    console.log("Operation completed");
  } catch (error) {
    console.error("Error:", error);
  }
}

testDynamoDB();
