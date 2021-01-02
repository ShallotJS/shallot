import type { ShallotAzureMiddlewareHandler, ShallotAzureMiddleware } from '../src/azure';
import type { AzureFunction as Handler, Context, Logger } from '@azure/functions';

import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAzure } from '../src';

describe('ShallotAzure Core', () => {
  const mockContext: Context = {
    invocationId: '',
    executionContext: {
      invocationId: '',
      functionName: '',
      functionDirectory: '',
    },
    bindings: [],
    bindingData: [],
    bindingDefinitions: [],
    traceContext: {
      traceparent: '',
      tracestate: '',
      attributes: {},
    },
    log: (console as unknown) as Logger,
    done: () => undefined,
  };
  const mockHandler: Handler = async () => 'unused';
  const mockHandlerWithError: Handler = async () => {
    throw new Error();
  };
  const basicMiddlewareHandler: ShallotAzureMiddlewareHandler = async () => undefined;

  test('Handler executes', async () => {
    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandler);

    const res = await wrappedHandler(mockContext);

    expect(res).toBe(await mockHandler(mockContext, jest.fn()));
  });

  test('Handler executes with before/after/finally middleware', async () => {
    const basicMiddleware: ShallotAzureMiddleware = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandler).use(basicMiddleware);

    const res = await wrappedHandler(mockContext);

    expect(res).toBe(await mockHandler(mockContext));
    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
  });

  test('onError middleware triggered during handler runtime exception', async () => {
    const basicMiddleware: ShallotAzureMiddleware = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandlerWithError).use(
      basicMiddleware
    );

    await wrappedHandler(mockContext);

    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).not.toHaveBeenCalled();
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.onError).toHaveBeenCalledTimes(1);
  });

  test('onError middleware not triggered during handler runtime', async () => {
    const basicMiddleware: ShallotAzureMiddleware = {
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandler).use(basicMiddleware);

    await wrappedHandler(mockContext);

    expect(basicMiddleware.onError).not.toHaveBeenCalled();
  });

  test('onError middleware that throws an error terminates runtime', async () => {
    const badMiddlewareHandler: ShallotAzureMiddlewareHandler = async () => {
      throw new Error();
    };
    const badMiddleware: ShallotAzureMiddleware = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(badMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandlerWithError).use(
      badMiddleware
    );

    await wrappedHandler(mockContext);

    expect(badMiddleware.before).toHaveBeenCalledTimes(1);
    expect(badMiddleware.onError).toHaveBeenCalledTimes(1);
    expect(badMiddleware.after).not.toHaveBeenCalled();
    expect(badMiddleware.finally).not.toHaveBeenCalled();
  });

  test('Execution order of multiple middlewares', async () => {
    const before1 = jest.fn(basicMiddlewareHandler);
    const after1 = jest.fn(basicMiddlewareHandler);
    const before2 = jest.fn(basicMiddlewareHandler);
    const after2 = jest.fn(basicMiddlewareHandler);

    const wrappedHandler = ShallotAzure.ShallotAzure(mockHandler)
      .use({ before: before1, after: after1 })
      .use({ before: before2, after: after2 });

    await wrappedHandler(mockContext);

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
