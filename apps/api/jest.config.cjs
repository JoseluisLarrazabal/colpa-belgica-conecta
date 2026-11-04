/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  globalSetup: '<rootDir>/test/global-setup.cjs',
  setupFiles: ['<rootDir>/test/env.cjs'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          ignoreDeprecations: '6.0',
          types: ['node', 'jest'],
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};
