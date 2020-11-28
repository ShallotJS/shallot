import type {
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerWithContextResult,
  APIGatewayAuthorizerResultContext,
} from 'aws-lambda';

import type { ShallotHandler } from '../core';

export type ShallotAuthorizerHandler = ShallotHandler<
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerResult
>;

export type ShallotAuthorizerWithContextHandler<
  TResult extends APIGatewayAuthorizerResultContext
> = ShallotHandler<
  APIGatewayAuthorizerEvent,
  APIGatewayAuthorizerWithContextResult<TResult>
>;
