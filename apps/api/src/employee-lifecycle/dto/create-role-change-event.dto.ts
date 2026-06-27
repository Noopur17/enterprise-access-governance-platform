import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RoleDetailsDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsString()
  @IsNotEmpty()
  costCenter!: string;
}

export class CreateRoleChangeEventDto {
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsIn(['ROLE_CHANGE', 'DEPARTMENT_TRANSFER', 'PROMOTION', 'TERMINATION'])
  transitionType!: string;

  @IsISO8601()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => RoleDetailsDto)
  oldDetails!: RoleDetailsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => RoleDetailsDto)
  newDetails!: RoleDetailsDto;
}