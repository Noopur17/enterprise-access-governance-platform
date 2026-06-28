import { Module } from '@nestjs/common';
import { PolicyIntelligenceService } from './services/policy-intelligence.service';

@Module({
  providers: [PolicyIntelligenceService],
  exports: [PolicyIntelligenceService],
})
export class PolicyIntelligenceModule {}