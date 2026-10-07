import * as usersSchema from "./users";
import * as auditSchema from "./audit";
import * as mastersSchema from "./masters";
import * as employeesSchema from "./employees";
import * as documentsSchema from "./documents";
import * as transportSchema from "./transport";

export const schema = {
  ...usersSchema,
  ...auditSchema,
  ...mastersSchema,
  ...employeesSchema,
  ...documentsSchema,
  ...transportSchema,
};

export * from "./users";
export * from "./audit";
export * from "./masters";
export * from "./employees";
export * from "./documents";
export * from "./transport";
