export interface RoleChangeEvent {
  eventId: string;
  employeeId: string;
  transitionType: 'ROLE_CHANGE' | 'TRANSFER' | 'PROMOTION' | 'TERMINATION';
  timestamp: string;
  oldDetails: RoleDetails;
  newDetails: RoleDetails;
}

export interface RoleDetails {
  title: string;
  department: string;
  costCenter: string;
}
