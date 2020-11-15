/**
 * TypeScript + promises port of middy do-not-wait-for-empty-event-loop
 * https://github.com/middyjs/middy/tree/master/packages/do-not-wait-for-empty-event-loop
 */

import type { ShallotMiddlewareHandler, ShallotMiddlewareWithOptions } from '../core';

interface TShallotDoNotWaitForEmptyEventLoopOptions extends Record<string, unknown> {
  runBefore?: boolean;
  runAfter?: boolean;
  runOnError?: boolean;
}

const disableEmptyEventLoopWait: ShallotMiddlewareHandler = async (request) => {
  request.context.callbackWaitsForEmptyEventLoop = false;
};

/**
 * Shallot middleware that enables/disables the AWS Lambda
 * event loop.
 *
 * @param config optional object to pass config options
 */
const ShallotDoNotWaitForEmptyEventLoop: ShallotMiddlewareWithOptions<
  unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  TShallotDoNotWaitForEmptyEventLoopOptions
> = (config = { runBefore: true }) => ({
  before: config?.runBefore ? disableEmptyEventLoopWait : undefined,
  after: config?.runAfter ? disableEmptyEventLoopWait : undefined,
  onError: config?.runOnError ? disableEmptyEventLoopWait : undefined,
});

export default ShallotDoNotWaitForEmptyEventLoop;
