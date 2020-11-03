import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAWS } from '../src';

describe('ShallotAWS', () => {
  test('Empty Middleware', async () => {
    const handler = ShallotAWS(jest.fn()).use(jest.fn());
    expect(handler instanceof Function);
  });
});
