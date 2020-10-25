import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{js,ts}'],
};

export default config;
