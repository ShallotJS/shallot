/**
 * TypeScript + promises port of middy http-json-body-parser
 * https://github.com/middyjs/middy/tree/master/packages/http-json-body-parser
 */

import type { ShallotMiddlewareWithOptions } from '../core';
import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import HttpError from 'http-errors';

interface TShallotErrorHandlerOptions extends Record<string, unknown> {
  logger?: (...args: string[]) => void;
}

/**
 * Shallot middleware that parses and replaces the JSON body of HTTP request bodies.
 * Requires the Content-Type header to be properly set.
 *
 * @param config optional object to pass config options
 */
const ShallotHTTPErrorHandler: ShallotMiddlewareWithOptions<
  APIGatewayEvent,
  APIGatewayProxyResult,
  TShallotErrorHandlerOptions
> = (config) => ({
  onError: async (request) => {
    config = { logger: console.error, ...config };

    if (HttpError.isHttpError(request.error)) {
      if (config.logger != null) {
        config.logger(request.error.message);
      }

      request.response = {
        statusCode: request.error.statusCode,
        body: request.error.message,
      };
    }
  },
});

export default ShallotHTTPErrorHandler;
