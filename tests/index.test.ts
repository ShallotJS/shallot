import { test, describe, jest, expect } from '@jest/globals';

import ShallotAWS from '../src/aws';

describe('ShallotAWS', () => {
  test('Empty Middleware', async () => {
    expect(ShallotAWS(jest.fn()) instanceof Function);
  });
});
