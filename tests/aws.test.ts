import type { ShallotAWSMiddlewareHandler, ShallotAWSMiddleware } from '../src/aws';
import type { Context, Handler } from 'aws-lambda';

import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAWS } from '../src';

describe('ShallotAWS Core', () => {
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
  const mockHandlerWithError: Handler<unknown, string> = async () => {
    throw new Error();
  };
  const basicMiddlewareHandler: ShallotAWSMiddlewareHandler = async () => undefined;

  test('Handler executes', async () => {
    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandler);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
  });

  test('Handler executes with before/after/finally middleware', async () => {
    const basicMiddleware: ShallotAWSMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandler).use(basicMiddleware);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
  });

  test('onError middleware triggered during handler runtime exception', async () => {
    const basicMiddleware: ShallotAWSMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandlerWithError).use(
      basicMiddleware
    );

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).not.toHaveBeenCalled();
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.onError).toHaveBeenCalledTimes(1);
  });

  test('onError middleware not triggered during handler runtime', async () => {
    const basicMiddleware: ShallotAWSMiddleware<unknown, string> = {
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandler).use(basicMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(basicMiddleware.onError).not.toHaveBeenCalled();
  });

  test('onError middleware that throws an error goes uncaught', async () => {
    const badMiddlewareHandler: ShallotAWSMiddlewareHandler = async () => {
      throw new Error();
    };
    const badMiddleware: ShallotAWSMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(badMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandlerWithError).use(badMiddleware);

    await expect(async () => {
      await wrappedHandler(undefined, mockContext, jest.fn());
    }).rejects.toThrowError();

    expect(badMiddleware.before).toHaveBeenCalledTimes(1);
    expect(badMiddleware.onError).toHaveBeenCalledTimes(1);
    expect(badMiddleware.after).not.toHaveBeenCalled();
    expect(badMiddleware.finally).not.toHaveBeenCalled();
  });

  test('onError middleware chain terminates from setting __handledError', async () => {
    const handledErrorMiddlewareHandler: ShallotAWSMiddlewareHandler = async (
      request
    ) => {
      request.__handledError = true;
    };
    const handledErrorMiddleware: ShallotAWSMiddleware<unknown, string> = {
      onError: jest.fn(handledErrorMiddlewareHandler),
    };
    const basicMiddleware: ShallotAWSMiddleware<unknown, string> = {
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandlerWithError)
      .use(handledErrorMiddleware)
      .use(basicMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(handledErrorMiddleware.onError).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.onError).not.toHaveBeenCalled();
  });

  test('Execution order of multiple middlewares', async () => {
    const before1 = jest.fn(basicMiddlewareHandler);
    const after1 = jest.fn(basicMiddlewareHandler);
    const before2 = jest.fn(basicMiddlewareHandler);
    const after2 = jest.fn(basicMiddlewareHandler);

    const wrappedHandler = ShallotAWS.ShallotAWS(mockHandler)
      .use({ before: before1, after: after1 })
      .use({ before: before2, after: after2 });

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(before1).toHaveBeenCalledTimes(1);
    expect(after1).toHaveBeenCalledTimes(1);
    expect(before2).toHaveBeenCalledTimes(1);
    expect(after2).toHaveBeenCalledTimes(1);

    expect(before1.mock.invocationCallOrder[0]).toBeLessThan(
      before2.mock.invocationCallOrder[0]
    );

    expect(before2.mock.invocationCallOrder[0]).toBeLessThan(
      after2.mock.invocationCallOrder[0]
    );

    expect(after2.mock.invocationCallOrder[0]).toBeLessThan(
      after1.mock.invocationCallOrder[0]
    );
  });
});
