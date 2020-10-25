import 'ts-jest';

import { dummyFunction } from '../src/index';

test('Dummy test', () => {
  expect(dummyFunction()).toEqual(0);
});
