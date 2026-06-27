import { Module } from '@nestjs/common';
import { EmployeeLifecycleModule } from './employee-lifecycle/employee-lifecycle.module';

@Module({
  imports: [EmployeeLifecycleModule],
})
export class AppModule {}