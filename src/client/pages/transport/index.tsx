import React, { useState } from "react";
import { LayoutDashboard, Route, Bus, Users, CalendarDays } from "lucide-react";
import { TransportOverviewTab } from "./transport-overview";
import { RoutesTab } from "./routes-tab";
import { VehiclesTab } from "./vehicles-tab";
import { AssignmentsTab } from "./assignments-tab";
import { RouteDialog } from "./route-dialog";
import { VehicleDialog } from "./vehicle-dialog";
import { AssignmentDialog } from "./assignment-dialog";
import { EndAssignmentDialog } from "./end-assignment-dialog";
import { DailyDispatch } from "./daily-dispatch";
import type {
  TransportRoute,
  TransportVehicle,
  TransportAssignment,
} from "../../../shared/types/transport";

export type TransportTabType = "overview" | "routes" | "vehicles" | "assignments" | "dispatch";

interface TransportPageProps {
  initialTab?: TransportTabType;
  onViewEmployee?: (employeeId: string) => void;
}

export const TransportPage: React.FC<TransportPageProps> = ({
  initialTab = "overview",
  onViewEmployee,
}) => {
  const [activeTab, setActiveTab] = useState<TransportTabType>(initialTab);

  // Dialogs state
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState<TransportRoute | null>(null);

  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<TransportVehicle | null>(null);

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<TransportAssignment | null>(null);

  const [isEndAssignmentDialogOpen, setIsEndAssignmentDialogOpen] = useState(false);
  const [assignmentToEnd, setAssignmentToEnd] = useState<TransportAssignment | null>(null);

  const handleOpenNewRoute = () => {
    setRouteToEdit(null);
    setIsRouteDialogOpen(true);
  };

  const handleEditRoute = (route: TransportRoute) => {
    setRouteToEdit(route);
    setIsRouteDialogOpen(true);
  };

  const handleOpenNewVehicle = () => {
    setVehicleToEdit(null);
    setIsVehicleDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: TransportVehicle) => {
    setVehicleToEdit(vehicle);
    setIsVehicleDialogOpen(true);
  };

  const handleOpenNewAssignment = () => {
    setAssignmentToEdit(null);
    setIsAssignmentDialogOpen(true);
  };

  const handleEditAssignment = (assignment: TransportAssignment) => {
    setAssignmentToEdit(assignment);
    setIsAssignmentDialogOpen(true);
  };

  const handleEndAssignment = (assignment: TransportAssignment) => {
    setAssignmentToEnd(assignment);
    setIsEndAssignmentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Transport Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Company transportation corridors, fleet management, and employee commute allocations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "routes", label: "Routes", icon: Route },
            { id: "vehicles", label: "Vehicles", icon: Bus },
            { id: "assignments", label: "Assignments", icon: Users },
            { id: "dispatch", label: "Daily Dispatch", icon: CalendarDays },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TransportTabType)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <TransportOverviewTab
          onOpenNewAssignment={handleOpenNewAssignment}
          onOpenNewRoute={handleOpenNewRoute}
          onOpenNewVehicle={handleOpenNewVehicle}
          onSwitchTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === "routes" && (
        <RoutesTab
          onOpenNewRoute={handleOpenNewRoute}
          onEditRoute={handleEditRoute}
        />
      )}

      {activeTab === "vehicles" && (
        <VehiclesTab
          onOpenNewVehicle={handleOpenNewVehicle}
          onEditVehicle={handleEditVehicle}
        />
      )}

      {activeTab === "assignments" && (
        <AssignmentsTab
          onOpenNewAssignment={handleOpenNewAssignment}
          onEditAssignment={handleEditAssignment}
          onEndAssignment={handleEndAssignment}
          onViewEmployee={onViewEmployee}
        />
      )}

      {activeTab === "dispatch" && <DailyDispatch />}

      {/* Modals */}
      <RouteDialog
        isOpen={isRouteDialogOpen}
        onClose={() => setIsRouteDialogOpen(false)}
        routeToEdit={routeToEdit}
      />

      <VehicleDialog
        isOpen={isVehicleDialogOpen}
        onClose={() => setIsVehicleDialogOpen(false)}
        vehicleToEdit={vehicleToEdit}
      />

      <AssignmentDialog
        isOpen={isAssignmentDialogOpen}
        onClose={() => setIsAssignmentDialogOpen(false)}
        assignmentToEdit={assignmentToEdit}
      />

      <EndAssignmentDialog
        isOpen={isEndAssignmentDialogOpen}
        onClose={() => setIsEndAssignmentDialogOpen(false)}
        assignment={assignmentToEnd}
      />
    </div>
  );
};
