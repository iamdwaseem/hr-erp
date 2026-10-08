import * as usersSchema from "./users";
import * as auditSchema from "./audit";
import * as mastersSchema from "./masters";
import * as employeesSchema from "./employees";
import * as documentsSchema from "./documents";
import * as transportSchema from "./transport";
import * as payrollSchema from "./payroll";
import * as attendanceSchema from "./attendance";
import * as leaveSchema from "./leave";

export const schema = {
  ...usersSchema,
  ...auditSchema,
  ...mastersSchema,
  ...employeesSchema,
  ...documentsSchema,
  ...transportSchema,
  ...payrollSchema,
  ...attendanceSchema,
  ...leaveSchema,
};

export * from "./users";
export * from "./audit";
export * from "./masters";
export * from "./employees";
export * from "./documents";
export * from "./transport";
export * from "./payroll";
export * from "./attendance";
export * from "./leave";
