import { Module } from '@nestjs/common';
import { AccessGovernanceModule } from '../access-governance/access-governance.module';
import { RoleChangeEventsController } from './controllers/role-change-events.controller';
import { WorkdayWebhookController } from './controllers/workday-webhook.controller';
import { RoleChangeJobProcessorService } from './services/role-change-job-processor.service';
import { RoleChangeIngestionService } from './services/role-change-ingestion.service';

@Module({
  imports: [AccessGovernanceModule],
  controllers: [RoleChangeEventsController, WorkdayWebhookController],
  providers: [RoleChangeIngestionService, RoleChangeJobProcessorService],
})
export class EmployeeLifecycleModule {}