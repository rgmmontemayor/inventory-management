# Inventory Management System

A serverless inventory management application built with an AWS CDK / Lambda backend for tracking products across warehouses. A frontend is planned but not yet implemented.

## Project Structure

```
inventory-management/
├── backend/     # AWS CDK backend (API + Lambda functions)
└── frontend/    # Reserved for the web client (not yet implemented)
```

## Tech Stack

**Backend** (`backend/`)
- [AWS CDK](https://aws.amazon.com/cdk/) (TypeScript) for infrastructure as code
- AWS Lambda for compute
- Amazon API Gateway (REST API)
- Amazon DynamoDB for storage (with streams enabled)
- Zod for request validation
- Jest + aws-sdk-client-mock for unit tests

## Architecture

The backend provisions:
- A DynamoDB table (`PK` / `SK` composite key, with DynamoDB Streams enabled) to store inventory data
- A REST API exposed via API Gateway under `/v1/warehouses/{warehouseId}/products`
- Lambda functions for product operations: create, get all, update, delete

> Note: as of this writing, the Lambda functions exist in `backend/lambda/products/` but are not yet wired into the API Gateway routes in the CDK stack — this is flagged as a TODO in `lib/backend-stack.ts`.

### Planned API Endpoints

| Method | Path                                          | Description                  |
|--------|-----------------------------------------------|-------------------------------|
| POST   | `/v1/warehouses/{warehouseId}/products`        | Create a product               |
| GET    | `/v1/warehouses/{warehouseId}/products`        | List all products in a warehouse |
| PUT    | `/v1/warehouses/{warehouseId}/products/{id}`   | Update a product               |
| DELETE | `/v1/warehouses/{warehouseId}/products/{id}`   | Delete a product               |

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- AWS account and credentials configured
- AWS CDK CLI (`npm install -g aws-cdk`)

### Backend Setup

```bash
cd backend
npm install

# Compile TypeScript
npm run build

# Run unit tests
npm run test

# Deploy to your default AWS account/region
npx cdk deploy
```

Other useful CDK commands:
- `npm run watch` — watch for changes and recompile
- `npx cdk diff` — compare the deployed stack with the current state
- `npx cdk synth` — emit the synthesized CloudFormation template

### Frontend

The `frontend/` directory is currently empty and reserved for a future web client.

## Testing

```bash
cd backend
npm run test
```

## License

No license specified.
