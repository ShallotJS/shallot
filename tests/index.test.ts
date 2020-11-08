import type { ShallotMiddlewareHandler, ShallotMiddleware } from '../src/aws';
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
  const basicMiddlewareHandler: ShallotMiddlewareHandler = async () => undefined;

  test('Handler executes', async () => {
    const wrappedHandler = ShallotAWS(mockHandler);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
  });

  test('Handler executes with before/after middleware', async () => {
    const basicMiddleware: ShallotMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandler).use(basicMiddleware);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).toHaveBeenCalledTimes(1);
  });

  test('onError middleware triggered during handler runtime exception', async () => {
    const mockHandlerWithError: Handler<unknown, string> = async () => {
      throw new Error();
    };
    const basicMiddleware: ShallotMiddleware<unknown, string> = {
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandlerWithError).use(basicMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(basicMiddleware.onError).toHaveBeenCalledTimes(1);
  });

  test('onError middleware not triggered during handler runtime', async () => {
    const basicMiddleware: ShallotMiddleware<unknown, string> = {
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandler).use(basicMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(basicMiddleware.onError).not.toHaveBeenCalled();
  });
});
