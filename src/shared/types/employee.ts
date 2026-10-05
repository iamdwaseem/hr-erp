export type EmploymentStatus =
  | "active"
  | "probation"
  | "terminated"
  | "resigned"
  | "on_leave";

export interface Department {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string | null;
  employeeCode: string;
  employeeId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;

  mobile: string | null;
  email: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  joiningDate: string;
  departmentId: string | null;
  designationId: string | null;
  branchId: string | null;
  employmentStatus: EmploymentStatus;

  createdAt: string;
  updatedAt: string;

  // Joined master data fields
  department?: Department | null;
  designation?: Designation | null;
  branch?: Branch | null;
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  employeeId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  nationality: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  branchId: string | null;
  branchName: string | null;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  createdAt: string;
}
