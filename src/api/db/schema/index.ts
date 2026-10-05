import * as usersSchema from "./users";
import * as auditSchema from "./audit";

export const schema = {
  ...usersSchema,
  ...auditSchema,
};

export * from "./users";
export * from "./audit";
