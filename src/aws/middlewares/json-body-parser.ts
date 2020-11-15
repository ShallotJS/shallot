/**
 * TypeScript + promises port of middy http-json-body-parser
 * https://github.com/middyjs/middy/tree/master/packages/http-json-body-parser
 */

import type { ShallotMiddlewareWithOptions } from '..';
import type { APIGatewayEvent } from 'aws-lambda';

import ContentType from 'content-type';
import HttpError from 'http-errors';

interface IHTTPRequestEvent {
  isBase64Encoded?: boolean;
  body: string;
  headers: Record<string | number | symbol, unknown>;
}

interface TShallotJSONBodyParserOptions extends Record<string, unknown> {
  /** A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is. */
  reviver?: (key: string, value: unknown) => unknown;
}

const isJSONContentType = (requestHeaders: IHTTPRequestEvent['headers']): boolean => {
  const contentTypeString =
    requestHeaders['content-type'] ?? requestHeaders['Content-Type'];
  if (typeof contentTypeString !== 'string') return false;

  const { type } = ContentType.parse(contentTypeString);
  return type.match(/^application\/(.*\+)?json$/) != null;
};

/**
 * Shallot middleware that parses and replaces the JSON body of HTTP request bodies.
 * Requires the Content-Type header to be properly set.
 *
 * @param config optional object to pass config options
 */
const ShallotJSONBodyParser: ShallotMiddlewareWithOptions<
  APIGatewayEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  TShallotJSONBodyParserOptions
> = (config) => ({
  before: async (request) => {
    if (request.event.headers != null && isJSONContentType(request.event.headers)) {
      try {
        if (request.event.body == null) throw new Error();
        const bodyString = request.event.isBase64Encoded
          ? Buffer.from(request.event.body, 'base64').toString()
          : request.event.body;

        request.event.body = JSON.parse(bodyString, config?.reviver);
      } catch (_) {
        throw new HttpError.UnprocessableEntity('Invalid JSON content');
      }
    }
  },
});

export default ShallotJSONBodyParser;
