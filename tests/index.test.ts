import type { ShallotMiddlewareHandler, ShallotMiddlewareWithOptions } from '../src/aws';
import type { Context, Handler } from 'aws-lambda';

import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAWS } from '../src';

describe('ShallotAWS', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    memoryLimitInMB: '',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 0,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  };
  const mockHandler: Handler<unknown, string> = async () => 'unused';

  test('Handler executes', async () => {
    const wrappedHandler = ShallotAWS(mockHandler);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
  });

  test('Handler executes with before/after middleware', async () => {
    const basicMiddlewareHandler: ShallotMiddlewareHandler = jest.fn(
      async () => undefined
    );
    const basicMiddleware: ShallotMiddlewareWithOptions<unknown, string> = () => ({
      before: basicMiddlewareHandler,
      after: basicMiddlewareHandler,
    });

    const wrappedHandler = ShallotAWS(mockHandler).use(basicMiddleware());

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
    expect(basicMiddlewareHandler).toHaveBeenCalledTimes(2);
  });
});
