import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { EmployeeLifecycleModule } from './employee-lifecycle/employee-lifecycle.module';
import { ExecutionModule } from './execution/execution.module';

@Module({
  imports: [DatabaseModule, EmployeeLifecycleModule, ExecutionModule],
})
export class AppModule {}