import * as usersSchema from "./users";
import * as auditSchema from "./audit";
import * as mastersSchema from "./masters";
import * as employeesSchema from "./employees";

export const schema = {
  ...usersSchema,
  ...auditSchema,
  ...mastersSchema,
  ...employeesSchema,
};

export * from "./users";
export * from "./audit";
export * from "./masters";
export * from "./employees";
