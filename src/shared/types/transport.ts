export type TransportStatus = "active" | "inactive";
export type AssignmentStatus = "active" | "ended" | "cancelled";

export interface TransportRoute {
  id: string;
  name: string;
  code: string;
  description: string | null;
  pickupPoints: string | null;
  destinationBranchId: string | null;
  status: TransportStatus;
  createdAt: string;
  updatedAt: string;
  destinationBranch?: {
    id: string;
    name: string;
    code: string;
    city?: string | null;
  } | null;
  activeAssignmentsCount?: number;
}

export interface TransportVehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  capacity: number;
  driverName: string | null;
  driverPhone: string | null;
  status: TransportStatus;
  createdAt: string;
  updatedAt: string;
  activeAssignmentsCount?: number;
}

export interface TransportAssignment {
  id: string;
  employeeId: string;
  routeId: string;
  vehicleId: string | null;
  pickupPoint: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: AssignmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    employeeId: string;
    fullName: string;
    localMobile?: string | null;
    localEmail?: string | null;
    employmentStatus: string;
    department?: { id: string; name: string } | null;
    designation?: { id: string; name: string } | null;
    branch?: { id: string; name: string } | null;
  };
  route?: {
    id: string;
    name: string;
    code: string;
    destinationBranchId?: string | null;
  };
  vehicle?: {
    id: string;
    registrationNumber: string;
    vehicleType: string;
    driverName?: string | null;
    driverPhone?: string | null;
  } | null;
}

export interface TransportOverview {
  activeRoutesCount: number;
  activeVehiclesCount: number;
  assignedEmployeesCount: number;
  totalVehicleCapacity: number;
  availableCapacity: number;
  recentAssignments: TransportAssignment[];
}
