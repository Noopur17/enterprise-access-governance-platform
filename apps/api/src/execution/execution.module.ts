import { Module } from '@nestjs/common';
import { DownstreamAccessAdapter } from './adapters/downstream-access.adapter';
import { DownstreamRateLimiterService } from './services/downstream-rate-limiter.service';
import { ExecutionWorkerService } from './services/execution-worker.service';

@Module({
  providers: [
    DownstreamAccessAdapter,
    DownstreamRateLimiterService,
    ExecutionWorkerService,
  ],
})
export class ExecutionModule {}