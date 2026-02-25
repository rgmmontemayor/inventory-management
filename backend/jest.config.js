module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lambda'],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
    }]
  },
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
