import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import pkg from "@aws-sdk/types";
const { InitializeMiddleware, Pluggable } = pkg;
import pkg_config_resolver from "@smithy/config-resolver";
const { RegionResolvedConfig } = pkg_config_resolver;
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

function createLogConsumedCapacityPlugin(region) {
  return {
    applyToStack: (stack) => {
      // Lower the threshold to see more logs
      const LOG_CONSUMED_CAPACITY = 2;

      console.log("Plugin initialized with threshold:", LOG_CONSUMED_CAPACITY);

      if (LOG_CONSUMED_CAPACITY) {
        stack.add(
          (next) => async (args) => {
            args.input = {
              ...args.input,
              ReturnConsumedCapacity: "TOTAL",
            };
            console.log("Middleware added to stack, input: ", args.input);
            // result.response contains data returned from next middleware.
            return next(args);
          },
          {
            name: "logConsumedCapacityMiddleware",
             step: "serialize",

            // use the following parameters if using stack.addRelativeTo
            // relation: "after",
            // toMiddleware: "DocumentMarshall",
          }
        );
      }
    },
  };
}

const plugin = createLogConsumedCapacityPlugin("us-east-1");

async function testDynamoDB() {
  try {
    const ddb = new DynamoDBClient({});

    const ddbDocumentClient = DynamoDBDocumentClient.from(ddb);
    ddbDocumentClient.middlewareStack.use(plugin);
    // ddbDocumentClient.middlewareStack.use(
    //   createLogConsumedCapacityPlugin("us-east-1")
    // );
    const command = new GetCommand({
      TableName: "test",
      Key: { testKey: "aaa" },
      // ReturnConsumedCapacity: "TOTAL",
    });

    const result = await ddbDocumentClient.send(command);

    console.log(result);
    console.log("Operation completed");
  } catch (error) {
    console.error("Error:", error);
  }
}

testDynamoDB();
