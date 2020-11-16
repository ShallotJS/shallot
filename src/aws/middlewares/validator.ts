/**
 * TypeScript + promises port of middy do-not-wait-for-empty-event-loop
 * https://github.com/middyjs/middy/tree/master/packages/do-not-wait-for-empty-event-loop
 */

import createHttpError from 'http-errors';
import type { ShallotMiddlewareWithOptions } from '../core';
import Ajv from 'ajv';

interface TShallotValidatorOptions extends Record<string, unknown> {
  inputSchema?: Record<string | number | symbol, unknown>;
  outputSchema?: Record<string | number | symbol, unknown>;
}

/**
 * Shallot middleware that disables the AWS Lambda
 * event loop.
 *
 * @param config optional object to pass config options
 */
const ShallotValidator: ShallotMiddlewareWithOptions<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string | number | symbol, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  TShallotValidatorOptions
> = (config) => {
  const ajvInst = new Ajv();

  return {
    before: async (request) => {
      if (config?.inputSchema == null) return;
      const validator = ajvInst.compile(config.inputSchema);
      const valid = validator(request.event);

      if (!valid) {
        const error = new createHttpError.BadRequest('Event object failed validation');
        error.details = validator.errors;
        throw error;
      }
    },
    after: async (request) => {
      if (config?.outputSchema == null) return;
      const validator = ajvInst.compile(config.outputSchema);
      const valid = validator(request.response);

      if (!valid) {
        const error = new createHttpError.InternalServerError(
          'Response object failed validation'
        );
        error.details = validator.errors;
        throw error;
      }
    },
  };
};

export default ShallotValidator;
