import React from "react";
import {
  Route,
  Bus,
  Users,
  PieChart,
  PlusCircle,
  Calendar,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useTransportOverview } from "../../hooks/use-transport";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface TransportOverviewProps {
  onOpenNewAssignment: () => void;
  onOpenNewRoute: () => void;
  onOpenNewVehicle: () => void;
  onSwitchTab: (tab: "routes" | "vehicles" | "assignments") => void;
}

export const TransportOverviewTab: React.FC<TransportOverviewProps> = ({
  onOpenNewAssignment,
  onOpenNewRoute,
  onOpenNewVehicle,
  onSwitchTab,
}) => {
  const { data: overview, isLoading, error } = useTransportOverview();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-sm text-destructive">
        Failed to load transport overview metrics. Please refresh or retry.
      </div>
    );
  }

  const {
    activeRoutesCount,
    activeVehiclesCount,
    assignedEmployeesCount,
    totalVehicleCapacity,
    availableCapacity,
    recentAssignments,
  } = overview;

  const occupancyRate =
    totalVehicleCapacity > 0
      ? Math.min(100, Math.round((assignedEmployeesCount / totalVehicleCapacity) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Operational Overview</h2>
          <p className="text-sm text-muted-foreground">
            Current fleet capacity, active routes, and employee transit commitments
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={onOpenNewRoute}>
            <PlusCircle className="mr-1.5 h-4 w-4" /> Add Route
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenNewVehicle}>
            <PlusCircle className="mr-1.5 h-4 w-4" /> Add Vehicle
          </Button>
          <Button size="sm" onClick={onOpenNewAssignment}>
            <PlusCircle className="mr-1.5 h-4 w-4" /> New Assignment
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Routes */}
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSwitchTab("routes")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Routes
            </CardTitle>
            <Route className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeRoutesCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Configured transit corridors</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
            </p>
          </CardContent>
        </Card>

        {/* Active Vehicles */}
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSwitchTab("vehicles")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Vehicles
            </CardTitle>
            <Bus className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeVehiclesCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Total capacity: {totalVehicleCapacity} seats</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
            </p>
          </CardContent>
        </Card>

        {/* Employees Using Transport */}
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSwitchTab("assignments")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employees Assigned
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{assignedEmployeesCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{occupancyRate}% fleet occupancy</span>
              <ArrowRight className="h-3 w-3 ml-auto opacity-70" />
            </p>
          </CardContent>
        </Card>

        {/* Available Seat Capacity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Capacity
            </CardTitle>
            <PieChart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{availableCapacity}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Seats available for allocation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Recent Transport Assignments
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest employee route allocations across the organization
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSwitchTab("assignments")}>
            View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentAssignments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No transport assignments registered yet.
            </div>
          ) : (
            <div className="divide-y">
              {recentAssignments.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {a.employee?.fullName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({a.employee?.employeeCode})
                      </span>
                      <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {a.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3 text-primary" />
                        {a.route?.name} ({a.route?.code})
                      </span>
                      {a.pickupPoint && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {a.pickupPoint}
                        </span>
                      )}
                      {a.vehicle && (
                        <span className="flex items-center gap-1">
                          <Bus className="h-3 w-3" />
                          {a.vehicle.registrationNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 sm:text-right">
                    <Calendar className="h-3 w-3" />
                    <span>From {a.effectiveFrom}</span>
                    {a.effectiveTo ? <span> to {a.effectiveTo}</span> : <span> (Ongoing)</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
