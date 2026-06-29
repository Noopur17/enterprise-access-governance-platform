import { z } from 'zod';

export const WorkdayRoleChangeEventSchema = z.object({
  event_id: z.string().min(1),
  employee_id: z.string().min(1),
  transition_type: z.enum([
    'ROLE_CHANGE',
    'DEPARTMENT_TRANSFER',
    'PROMOTION',
    'TERMINATION',
  ]),
  timestamp: z.string().datetime(),

  old_details: z.object({
    title: z.string().min(1),
    department: z.string().min(1),
    cost_center: z.string().min(1),
  }),

  new_details: z.object({
    title: z.string().min(1),
    department: z.string().min(1),
    cost_center: z.string().min(1),
  }),
});

export type WorkdayRoleChangeEventDto = z.infer<
  typeof WorkdayRoleChangeEventSchema
>;