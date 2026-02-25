import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME ?? "InventoryTable";

// Zod validation schema (Consistency - ACID)
const CreateProductSchema = z.object({
  productId: z.string().optional(), // auto-generated if not provided
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
});

function buildResponse(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { warehouseId } = event.pathParameters ?? {};

  if (!warehouseId) {
    return buildResponse(400, { message: "Missing warehouseId in path." });
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return buildResponse(400, { message: "Invalid JSON body." });
  }

  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return buildResponse(400, {
      message: "Validation failed.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, category, price, quantity } = parsed.data;
  const productId = parsed.data.productId ?? randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `WAREHOUSE#${warehouseId}`,
    SK: `PRODUCT#${productId}`,
    productId,
    name,
    category,
    price,
    quantity,
    status: "ACTIVE",
    version: 1, // Initial version
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        // Atomicity - prevent duplicate product creation
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
    );

    return buildResponse(201, { message: "Product created successfully.", product: item });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      return buildResponse(409, {
        message: `Product ${productId} already exists in warehouse ${warehouseId}.`,
      });
    }

    console.error("Unexpected error:", error);
    return buildResponse(500, { message: "Internal server error." });
  }
};
