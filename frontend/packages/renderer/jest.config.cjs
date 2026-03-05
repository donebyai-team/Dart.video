module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: false, tsconfig: { module: 'commonjs' } }],
  },
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  testRegex: '/src/__tests__/.*\\.test\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
