import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //  Environment handling
    const environment = this.node.tryGetContext('environment') || 'dev';
    const project = 'inventory';

    const name = (service: string) => `${project}-${service}-${environment}`;

    //  DynamoDB Table (Scenario 1 Compliant)
    const table = new dynamodb.Table(this, 'InventoryTable', {
      tableName: name('dynamodb'),
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        environment === 'dev'
          ? cdk.RemovalPolicy.DESTROY
          : cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    //  REST API 
    const api = new apigateway.RestApi(this, 'InventoryApi', {
      restApiName: name('apigw'),
      deployOptions: {
        stageName: environment,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    //  API Route Structure
    const v1 = api.root.addResource('v1');
    const warehouses = v1.addResource('warehouses');
    const warehouse = warehouses.addResource('{warehouseId}');
    const products = warehouse.addResource('products');

    // Note:
    // Lambda integrations will be added after backend implementation is ready.
  }
}
