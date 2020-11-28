import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import type { ShallotHandler } from '../core';

export type ShallotRESTHandler<
  TEvent extends APIGatewayProxyEvent,
  TResult extends APIGatewayProxyResult
> = ShallotHandler<TEvent, TResult>;
