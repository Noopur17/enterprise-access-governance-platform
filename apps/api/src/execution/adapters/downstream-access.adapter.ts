import { Injectable, Logger } from '@nestjs/common';

export type DownstreamExecutionInput = {
  taskId: string;
  reviewId: string;
  systemName: string;
  entitlementKey: string;
  action: string;
};

export type DownstreamExecutionResult = {
  externalRequestId: string;
  status: 'SUCCEEDED';
};

@Injectable()
export class DownstreamAccessAdapter {
  private readonly logger = new Logger(DownstreamAccessAdapter.name);

  async execute(
    input: DownstreamExecutionInput,
  ): Promise<DownstreamExecutionResult> {
    const normalizedSystem = input.systemName.toUpperCase();

    this.logger.log(
      `Mock downstream execution system=${normalizedSystem}, task=${input.taskId}, action=${input.action}, entitlement=${input.entitlementKey}`,
    );

    return {
      externalRequestId: `MOCK-${normalizedSystem}-${Date.now()}`,
      status: 'SUCCEEDED',
    };
  }
}