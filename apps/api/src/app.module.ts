import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { EmployeeLifecycleModule } from './employee-lifecycle/employee-lifecycle.module';

@Module({
  imports: [DatabaseModule, EmployeeLifecycleModule],
})
export class AppModule {}