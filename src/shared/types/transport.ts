export type TransportStatus = "active" | "inactive";
export type AssignmentStatus = "active" | "ended" | "cancelled";
export type TransportShift = string;
export type TripDirection = "PICKUP" | "DROPOFF";
export type TripStatus = "planned" | "ready" | "in_progress" | "completed" | "cancelled";
export type BoardingStatus = "planned" | "boarded" | "absent" | "replaced";

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
  stops?: TransportRouteStop[];
}

export interface TransportRouteStop {
  id: string;
  routeId: string;
  sequence: number;
  name: string;
  location: string;
  pickupTime: string | null;
  dropoffTime: string | null;
  status: "active" | "inactive";
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
  accommodation: string | null;
  shift: TransportShift;
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

export interface TransportTrip {
  id: string;
  routeId: string;
  vehicleId: string | null;
  serviceDate: string;
  shift: TransportShift;
  direction: TripDirection;
  driverName: string | null;
  driverPhone: string | null;
  status: TripStatus;
  notes: string | null;
  passengerCount?: number;
  boardedCount?: number;
  route?: Pick<TransportRoute, "id" | "name" | "code">;
  vehicle?: Pick<TransportVehicle, "id" | "registrationNumber" | "vehicleType"> | null;
}

export interface TransportTripPassenger {
  id: string;
  tripId: string;
  employeeId: string;
  assignmentId: string | null;
  boardingStatus: BoardingStatus;
  boardedAt: string | null;
  notes: string | null;
  employee?: Pick<TransportAssignment["employee"] extends infer T ? NonNullable<T> : never, "id" | "employeeCode" | "fullName">;
}
