import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

import type { ShallotHandler } from '../core';

export type ShallotWebSocketHandler<
  TEvent extends APIGatewayProxyEventV2,
  TResult extends APIGatewayProxyResultV2
> = ShallotHandler<TEvent, TResult>;
