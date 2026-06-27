import { Module } from '@nestjs/common';
import { AccessGovernanceModule } from '../access-governance/access-governance.module';
import { RoleChangeEventsController } from './controllers/role-change-events.controller';
import { RoleChangeIngestionService } from './services/role-change-ingestion.service';

@Module({
  imports: [AccessGovernanceModule],
  controllers: [RoleChangeEventsController],
  providers: [RoleChangeIngestionService],
})
export class EmployeeLifecycleModule {}