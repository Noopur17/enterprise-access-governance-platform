export function maskEmployeeId(employeeId: string): string {
  if (!employeeId || employeeId.length <= 4) {
    return 'EMP-***';
  }

  return `${employeeId.slice(0, 4)}***${employeeId.slice(-2)}`;
}

export function maskCostCenter(costCenter: string): string {
  if (!costCenter || costCenter.length <= 4) {
    return 'CC-***';
  }

  return `${costCenter.slice(0, 3)}***${costCenter.slice(-2)}`;
}