/** @type {import('jest').Config} */
const config = {
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^(.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  verbose: true,
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  testMatch: ["**/test/**/*.test.ts", "**/test/**/*.spec.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/build/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(@modelcontextprotocol|ohm-js)/)",
  ],
  resolver: "jest-ts-webcompat-resolver",
};

module.exports = config;
