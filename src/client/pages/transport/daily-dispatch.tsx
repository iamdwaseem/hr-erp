import React, { useState } from "react";
import { CalendarDays, Check, Loader2, Play, UserCheck, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { useTransportRoutes, useTransportVehicles, useTransportTrips, useCreateTransportTrip, useTripPassengers, useUpdateBoardingStatus, useUpdateTripStatus } from "../../hooks/use-transport";

const today = new Date().toISOString().split("T")[0];

export const DailyDispatch: React.FC = () => {
  const [serviceDate, setServiceDate] = useState(today);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [shift, setShift] = useState("GENERAL");
  const [direction, setDirection] = useState<"PICKUP" | "DROPOFF">("PICKUP");
  const { data: routes = [] } = useTransportRoutes({ status: "active" });
  const { data: vehicles = [] } = useTransportVehicles({ status: "active" });
  const { data: trips = [], isLoading } = useTransportTrips(serviceDate);
  const { data: passengers = [] } = useTripPassengers(selectedTripId);
  const createTrip = useCreateTransportTrip();
  const updateStatus = useUpdateTripStatus();
  const updateBoarding = useUpdateBoardingStatus();

  const create = async () => {
    if (!routeId) return;
    await createTrip.mutateAsync({ routeId, vehicleId: vehicleId || null, serviceDate, shift, direction });
  };
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daily Dispatch</h2>
          <p className="text-sm text-muted-foreground">Plan each Dubai labour trip and record boarding status.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input className="h-9 rounded-md border bg-background px-3" type="date" value={serviceDate} onChange={(event) => { setServiceDate(event.target.value); setSelectedTripId(null); }} />
        </label>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5">
        <Select value={routeId} onChange={(event) => setRouteId(event.target.value)}>
          <option value="">Choose route</option>
          {routes.map((route) => <option key={route.id} value={route.id}>{route.name} ({route.code})</option>)}
        </Select>
        <Select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          <option value="">Flexible vehicle</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber} ({vehicle.capacity})</option>)}
        </Select>
        <Select value={shift} onChange={(event) => setShift(event.target.value)}>
          <option value="GENERAL">General</option><option value="DAY">Day shift</option><option value="NIGHT">Night shift</option>
        </Select>
        <Select value={direction} onChange={(event) => setDirection(event.target.value as "PICKUP" | "DROPOFF")}>
          <option value="PICKUP">Pickup to site</option><option value="DROPOFF">Dropoff to accommodation</option>
        </Select>
        <Button onClick={create} disabled={!routeId || createTrip.isPending}>{createTrip.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Trip</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 font-medium">Trips for {serviceDate}</div>
          {isLoading ? <div className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : trips.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No trips planned for this date.</p> : <div className="divide-y">{trips.map((trip) => <button key={trip.id} type="button" onClick={() => setSelectedTripId(trip.id)} className={`w-full p-4 text-left hover:bg-muted/40 ${selectedTripId === trip.id ? "bg-muted/50" : ""}`}><div className="flex items-center justify-between gap-3"><span className="font-medium">{trip.route?.name || trip.routeId}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{trip.status}</span></div><div className="mt-1 text-xs text-muted-foreground">{trip.shift} · {trip.direction} · {trip.boardedCount || 0}/{trip.passengerCount || 0} boarded</div></button>)}</div>}
        </div>

        <div className="rounded-lg border bg-card">
          {!selectedTrip ? <div className="flex min-h-48 items-center justify-center p-6 text-sm text-muted-foreground">Select a trip to manage its labour roster.</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h3 className="font-medium">{selectedTrip.route?.name}</h3><p className="text-xs text-muted-foreground">{selectedTrip.shift} · {selectedTrip.direction} · {selectedTrip.vehicle?.registrationNumber || "Flexible vehicle"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: selectedTrip.id, status: "in_progress" })}><Play className="mr-1 h-3.5 w-3.5" />Start</Button><Button size="sm" onClick={() => updateStatus.mutate({ id: selectedTrip.id, status: "completed" })}><Check className="mr-1 h-3.5 w-3.5" />Complete</Button></div></div>
            <div className="divide-y">{passengers.map((passenger) => <div key={passenger.id} className="flex items-center justify-between gap-3 p-3"><div><div className="text-sm font-medium">{passenger.employee?.fullName || passenger.employeeId}</div><div className="text-xs text-muted-foreground">{passenger.employee?.employeeCode || ""}</div></div><div className="flex gap-1"><Button title="Mark boarded" size="icon" variant={passenger.boardingStatus === "boarded" ? "default" : "outline"} onClick={() => updateBoarding.mutate({ tripId: selectedTrip.id, passengerId: passenger.id, boardingStatus: "boarded" })}><UserCheck className="h-4 w-4" /></Button><Button title="Mark absent" size="icon" variant={passenger.boardingStatus === "absent" ? "destructive" : "outline"} onClick={() => updateBoarding.mutate({ tripId: selectedTrip.id, passengerId: passenger.id, boardingStatus: "absent" })}><X className="h-4 w-4" /></Button></div></div>)}{passengers.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No active assignments match this route and shift.</p> : null}</div>
          </>}
        </div>
      </div>
    </div>
  );
};