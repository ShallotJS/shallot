import type { ShallotMiddlewareHandler, ShallotMiddleware } from '../src/aws/core';
import type {
  APIGatewayEvent,
  APIGatewayProxyResult,
  Context,
  Handler,
} from 'aws-lambda';

import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAWS } from '../src';
import ShallotJSONBodyParser from '../src/aws/middlewares/http-json-body-parser';
import ShallotHTTPCors from '../src/aws/middlewares/http-cors';
import ShallotHTTPErrorHandler from '../src/aws/middlewares/http-error-handler';
import HttpError from 'http-errors';

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
  const basicMiddlewareHandler: ShallotMiddlewareHandler = async () => undefined;

  test('Handler executes', async () => {
    const wrappedHandler = ShallotAWS(mockHandler);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
  });

  test('Handler executes with before/after/finally middleware', async () => {
    const basicMiddleware: ShallotMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandler).use(basicMiddleware);

    const res = await wrappedHandler(undefined, mockContext, jest.fn());

    expect(res).toBe(await mockHandler(undefined, mockContext, jest.fn()));
    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
  });

  test('onError middleware triggered during handler runtime exception', async () => {
    const basicMiddleware: ShallotMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandlerWithError).use(basicMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

    expect(basicMiddleware.before).toHaveBeenCalledTimes(1);
    expect(basicMiddleware.after).not.toHaveBeenCalled();
    expect(basicMiddleware.finally).toHaveBeenCalledTimes(1);
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

  test('onError middleware that throws an error terminates runtime', async () => {
    const badMiddlewareHandler: ShallotMiddlewareHandler = async () => {
      throw new Error();
    };
    const badMiddleware: ShallotMiddleware<unknown, string> = {
      before: jest.fn(basicMiddlewareHandler),
      after: jest.fn(basicMiddlewareHandler),
      onError: jest.fn(badMiddlewareHandler),
      finally: jest.fn(basicMiddlewareHandler),
    };

    const wrappedHandler = ShallotAWS(mockHandlerWithError).use(badMiddleware);

    await wrappedHandler(undefined, mockContext, jest.fn());

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

    const wrappedHandler = ShallotAWS(mockHandler)
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

describe('JSON Body Parser Middleware', () => {
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
  const sampleBody = { hello: 'world' };

  const mockHandler: Handler<APIGatewayEvent, APIGatewayEvent> = async (event) => event;

  test('Valid JSON body', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotJSONBodyParser());

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Lowercase content-type', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotJSONBodyParser());

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'content-type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Missing content-type header', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotJSONBodyParser());

    const mockEventNoHeader = ({
      body: JSON.stringify(sampleBody),
      headers: {},
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());
    expect(res.body).toEqual(mockEventNoHeader.body);
  });

  test('Invalid event body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onErrorMiddleware: ShallotMiddleware<APIGatewayEvent, any> = {
      onError: jest.fn(),
    };
    const wrappedHandler = ShallotAWS(mockHandler)
      .use(ShallotJSONBodyParser())
      .use(onErrorMiddleware);

    const mockEventNoHeader = ({
      body: 'this is not json',
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());

    expect(onErrorMiddleware.onError).toHaveBeenCalled();
  });

  test('Null event body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onErrorMiddleware: ShallotMiddleware<APIGatewayEvent, any> = {
      onError: jest.fn(),
    };
    const wrappedHandler = ShallotAWS(mockHandler)
      .use(ShallotJSONBodyParser())
      .use(onErrorMiddleware);

    const mockEventNoHeader = ({
      body: null,
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());

    expect(onErrorMiddleware.onError).toHaveBeenCalled();
  });

  test('Base64 encoded body', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotJSONBodyParser());

    const mockEvent = ({
      isBase64Encoded: true,
      body: Buffer.from(JSON.stringify(sampleBody)).toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Custom reviver', async () => {
    const reviver = (_: unknown, v: unknown) => (typeof v === 'string' ? 'test' : v);
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotJSONBodyParser({
        reviver,
      })
    );

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual({ hello: reviver('', '') });
  });
});

describe('CORS middleware', () => {
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

  const mockHandler: Handler<APIGatewayEvent, APIGatewayProxyResult> = async () => ({
    statusCode: 200,
    body: '',
  });

  test('Default usage', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotHTTPCors());

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': mockEvent.headers.Origin,
    });
  });

  test('Cache-Control for OPTIONS method', async () => {
    const cacheControl = 'no-cache';
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        cacheControl,
      })
    );

    const mockEvent = ({
      httpMethod: 'OPTIONS',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': mockEvent.headers.Origin,
      'Cache-Control': cacheControl,
    });
  });

  test('Credentials', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        credentials: true,
      })
    );

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': mockEvent.headers.Origin,
      'Access-Control-Allow-Credentials': 'true',
    });
  });

  test('Max-Age', async () => {
    const maxAge = '';
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        maxAge: maxAge,
      })
    );

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': mockEvent.headers.Origin,
      'Access-Control-Max-Age': maxAge,
    });
  });

  test('Unaccepted origin', async () => {
    const allowedOrigin = 'https://www.other-website.com';
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        allowedOrigins: [allowedOrigin],
      })
    );

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': allowedOrigin,
    });
  });

  test('Same origin', async () => {
    const allowedOrigin = 'https://www.other-website.com';
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        allowedOrigins: [allowedOrigin],
      })
    );

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        origin: allowedOrigin,
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({
      'Access-Control-Allow-Origin': allowedOrigin,
    });
  });

  test('No origins', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotHTTPCors({
        allowedOrigins: [],
      })
    );

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toEqual({});
  });

  test('No method', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotHTTPCors());

    const mockEvent = ({
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).not.toBeDefined;
  });

  test('response undefined', async () => {
    const handlerNoRes = () => undefined;
    const wrappedHandler = ShallotAWS<APIGatewayEvent, APIGatewayProxyResult>(
      handlerNoRes
    ).use(ShallotHTTPCors());

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toBeDefined;
  });

  test('Predefined headers', async () => {
    const handlerWithResHeaders = async () => ({
      body: '',
      statusCode: 200,
      headers: { 'X-Test': '' },
    });
    const wrappedHandler = ShallotAWS<APIGatewayEvent, APIGatewayProxyResult>(
      handlerWithResHeaders
    ).use(ShallotHTTPCors());

    const mockEvent = ({
      httpMethod: 'GET',
      headers: {
        Origin: 'https://www.example.com',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.headers).toMatchObject((await handlerWithResHeaders()).headers);
  });
});

describe('http-error-handler middleware', () => {
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

  const mockHandlerWithHTTPError: Handler<
    APIGatewayEvent,
    APIGatewayProxyResult
  > = async () => {
    throw HttpError(400, 'Test error message');
  };

  test('Skips normal errors', async () => {
    const mockHandlerWithError: Handler<
      APIGatewayEvent,
      APIGatewayProxyResult
    > = async () => {
      throw new Error('Test error');
    };

    const wrappedHandler = ShallotAWS(mockHandlerWithError).use(
      ShallotHTTPErrorHandler()
    );

    const res = await wrappedHandler(
      (undefined as unknown) as APIGatewayEvent,
      mockContext,
      jest.fn()
    );
    expect(res).not.toBeDefined();
  });

  test('Triggers from HTTPError', async () => {
    const wrappedHandler = ShallotAWS(mockHandlerWithHTTPError).use(
      ShallotHTTPErrorHandler({ logger: undefined })
    );

    const res = await wrappedHandler(
      (undefined as unknown) as APIGatewayEvent,
      mockContext,
      jest.fn()
    );
    expect(res.statusCode).toBe(400);
  });

  test('Custom logger', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const logger = jest.fn(() => {});
    const wrappedHandler = ShallotAWS(mockHandlerWithHTTPError).use(
      ShallotHTTPErrorHandler({ logger })
    );

    await wrappedHandler(
      (undefined as unknown) as APIGatewayEvent,
      mockContext,
      jest.fn()
    );
    expect(logger).toHaveBeenCalledTimes(1);
  });
});
