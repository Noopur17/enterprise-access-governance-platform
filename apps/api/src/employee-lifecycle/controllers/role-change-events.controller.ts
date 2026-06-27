import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateRoleChangeEventDto } from '../dto/create-role-change-event.dto';
import { RoleChangeIngestionService } from '../services/role-change-ingestion.service';

@Controller('role-change-events')
export class RoleChangeEventsController {
  constructor(
    private readonly roleChangeIngestionService: RoleChangeIngestionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() payload: CreateRoleChangeEventDto) {
    return this.roleChangeIngestionService.ingestRoleChangeEvent(payload);
  }
}