import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { handler } from "../index";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

function buildEvent(
  warehouseId: string | undefined,
  body: object | string | null
): APIGatewayProxyEvent {
  return {
    pathParameters: warehouseId ? { warehouseId } : null,
    body: typeof body === "string" ? body : JSON.stringify(body),
  } as unknown as APIGatewayProxyEvent;
}

const validBody = {
  name: "Laptop",
  category: "Electronics",
  price: 1500,
  quantity: 10,
};

// Test 1: Successful product creation
it("returns 201 on successful product creation", async () => {
  ddbMock.on(PutCommand).resolves({});

  const event = buildEvent("WH1", validBody);
  const result = await handler(event);

  expect(result.statusCode).toBe(201);
  const responseBody = JSON.parse(result.body);
  expect(responseBody.product.PK).toBe("WAREHOUSE#WH1");
  expect(responseBody.product.SK).toMatch(/^PRODUCT#/);
  expect(responseBody.product.version).toBe(1);
  expect(responseBody.product.status).toBe("ACTIVE");
});

// Test 2: Duplicate product creation
it("returns 409 when product already exists", async () => {
  ddbMock.on(PutCommand).rejects(
    Object.assign(new Error("ConditionalCheckFailedException"), {
      name: "ConditionalCheckFailedException",
    })
  );

  const event = buildEvent("WH1", { ...validBody, productId: "P100" });
  const result = await handler(event);

  expect(result.statusCode).toBe(409);
  expect(JSON.parse(result.body).message).toContain("already exists");
});

// Test 3: Missing warehouseId
it("returns 400 when warehouseId is missing", async () => {
  const event = buildEvent(undefined, validBody);
  const result = await handler(event);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body).message).toContain("warehouseId");
});

// Test 4: Invalid body - negative price
it("returns 400 when price is negative", async () => {
  const event = buildEvent("WH1", { ...validBody, price: -10 });
  const result = await handler(event);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body).message).toBe("Validation failed.");
});

// Test 5: Invalid body - missing required field
it("returns 400 when name is missing", async () => {
  const { name, ...bodyWithoutName } = validBody;
  const event = buildEvent("WH1", bodyWithoutName);
  const result = await handler(event);

  expect(result.statusCode).toBe(400);
});

// Test 6: Malformed JSON body
it("returns 400 when body is malformed JSON", async () => {
  const event = buildEvent("WH1", "not-valid-json");
  const result = await handler(event);

  expect(result.statusCode).toBe(400);
  expect(JSON.parse(result.body).message).toBe("Invalid JSON body.");
});

// Test 7: DynamoDB unexpected error returns 500
it("returns 500 on unexpected DynamoDB error", async () => {
  ddbMock.on(PutCommand).rejects(new Error("Network failure"));

  const event = buildEvent("WH1", validBody);
  const result = await handler(event);

  expect(result.statusCode).toBe(500);
  expect(JSON.parse(result.body).message).toBe("Internal server error.");
});

// Test 8: Custom productId is honored
it("uses provided productId instead of generating one", async () => {
  ddbMock.on(PutCommand).resolves({});

  const event = buildEvent("WH1", { ...validBody, productId: "P999" });
  const result = await handler(event);

  expect(result.statusCode).toBe(201);
  expect(JSON.parse(result.body).product.SK).toBe("PRODUCT#P999");
});
