module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["html", "text", "lcov"],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
};
