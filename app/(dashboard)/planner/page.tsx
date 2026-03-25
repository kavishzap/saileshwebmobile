"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getContracts } from "@/lib/services/contracts";
import { getCars } from "@/lib/services/cars";
import { getCustomers, getCustomerById } from "@/lib/services/customers";
import type { Contract } from "@/lib/types";
import type { Car } from "@/lib/types";
import {
  Calendar as BigCalendar,
  type Event as RBCEvent,
  Views,
} from "react-big-calendar";
import { dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";

const locales = {
  "en-GB": enGB,
};

const localizer = dateFnsLocalizer({
  format,
  parse: (str, fmt, refDate) => parse(str, fmt, refDate, { locale: enGB }),
  startOfWeek: () => startOfWeek(new Date(), { locale: enGB }),
  getDay,
  locales,
});

type PlannerEvent = RBCEvent & {
  contractId: string;
  carId: string | null;
  customerId: string;
  status: Contract["status"];
  carLabel?: string;
  customerName?: string;
  isTerminating?: boolean;
};

export default function ContractsPlannerPage() {
  const { toast } = useToast();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const [selectedCarId, setSelectedCarId] = useState<string | "all">("all");

  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null);

  const [view, setView] = useState<(typeof Views)[keyof typeof Views]>(
    Views.MONTH
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Load all contracts + cars + customers
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [contractsRes, carsRes, customersRes] = await Promise.all([
          getContracts(), // you already have this service
          getCars(),
          getCustomers(),
        ]);

        if (cancelled) return;

        setContracts(contractsRes);
        setCars(carsRes);
        setCustomers(
          customersRes.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
          }))
        );
      } catch (err: any) {
        if (cancelled) return;
        console.error("Failed to load planner data", err);
        toast({
          title: "Failed to load planner data",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Helper to get labels
  const getCarLabel = (id: string | null | undefined) => {
    if (id == null || id === "") return "No vehicle";
    const car = cars.find((c) => c.id === id);
    if (!car) return "Unknown car";

    // main label = plate number
    if ("plate_number" in car && car.plate_number) {
      return `${car.plate_number} – ${car.name}`;
    }

    return car.plateNumber ?? "Unknown car";
  };
  const getCustomerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "Unknown customer";

  // Build calendar events (exclude cancelled contracts)
  const events: PlannerEvent[] = useMemo(() => {
    const result: PlannerEvent[] = [];

    contracts
      .filter((c) => c.status !== "cancelled")
      .forEach((c) => {
        const start = new Date(c.startDate);
        const end = new Date(c.endDate);
        // react-big-calendar treats end as exclusive, so +1 day for all-day style
        end.setDate(end.getDate());

        const carLabel = getCarLabel(c.carId);
        const customerName = getCustomerName(c.customerId);

        // Main rental event
        result.push({
          contractId: c.id,
          carId: c.carId,
          customerId: c.customerId,
          status: c.status,
          carLabel,
          customerName,
          title: `${carLabel} – ${customerName}`,
          start,
          end: addDays(new Date(c.endDate), 1),
          allDay: true,
        });

        // "Terminating" indicator on the end date (skip for same-day contracts)
        const startDateOnly = new Date(c.startDate);
        startDateOnly.setHours(0, 0, 0, 0);
        const endDateOnly = new Date(c.endDate);
        endDateOnly.setHours(0, 0, 0, 0);
        if (startDateOnly.getTime() !== endDateOnly.getTime()) {
          result.push({
            contractId: c.id,
            carId: c.carId,
            customerId: c.customerId,
            status: c.status,
            carLabel,
            customerName,
            title: "↳ Terminating",
            start: endDateOnly,
            end: addDays(endDateOnly, 1),
            allDay: true,
            isTerminating: true,
          });
        }
      });

    return result;
  }, [contracts, cars, customers]);

  // Apply filters (by car)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedCarId !== "all" && ev.carId !== selectedCarId) return false;
      return true;
    });
  }, [events, selectedCarId]);

  // Contracts terminating in the currently viewed month
  const terminatingThisMonth = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return contracts
      .filter((c) => c.status !== "cancelled")
      .filter((c) => {
        if (selectedCarId !== "all" && c.carId !== selectedCarId) return false;
        const endDate = new Date(c.endDate);
        return endDate >= monthStart && endDate <= monthEnd;
      })
      .map((c) => ({
        contract: c,
        endDate: new Date(c.endDate),
        carLabel: getCarLabel(c.carId),
        customerName: getCustomerName(c.customerId),
      }))
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }, [contracts, cars, customers, currentDate, selectedCarId]);

  // Generate a consistent color for each contract
  const getContractColor = (contractId: string): string => {
    // Predefined palette of distinct colors
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#84cc16", // lime
      "#f97316", // orange
      "#6366f1", // indigo
      "#14b8a6", // teal
      "#a855f7", // violet
      "#22c55e", // emerald
      "#eab308", // yellow
      "#3b82f6", // blue (repeat for more contracts)
    ];

    // Hash the contract ID to get a consistent index
    let hash = 0;
    for (let i = 0; i < contractId.length; i++) {
      hash = contractId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Event styling
  const eventPropGetter = (event: PlannerEvent) => {
    const isTerminating = event.isTerminating;
    const backgroundColor = isTerminating
      ? "#f59e0b" // amber for terminating
      : getContractColor(event.contractId);
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        border: isTerminating ? "2px dashed rgba(255,255,255,0.9)" : "none",
        color: "white",
        fontSize: isTerminating ? "0.7rem" : "0.75rem",
        padding: "2px 4px",
        fontWeight: isTerminating ? 600 : undefined,
      },
    };
  };
  const selectedCar = selectedEvent
    ? cars.find((c) => c.id === selectedEvent.carId)
    : undefined;

  const selectedContract = selectedEvent
    ? contracts.find((c) => c.id === selectedEvent.contractId)
    : undefined;
  
  const [selectedCustomer, setSelectedCustomer] = useState<{ email: string; phone: string } | null>(null);

  useEffect(() => {
    if (selectedEvent) {
      (async () => {
        try {
          const customer = await getCustomerById(selectedEvent.customerId);
          if (customer) {
            setSelectedCustomer({
              email: customer.email || "",
              phone: customer.phone || "",
            });
          } else {
            setSelectedCustomer(null);
          }
        } catch {
          setSelectedCustomer(null);
        }
      })();
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedEvent]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contracts Planner"
        actions={
          <div className="min-w-[180px]">
            <Select
              value={selectedCarId}
              onValueChange={(val) =>
                setSelectedCarId(val === "all" ? "all" : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by car" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cars</SelectItem>
                {cars.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.plateNumber
                      ? `${c.plateNumber} – ${c.name}`
                      : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="px-3 sm:px-6 space-y-4">
        {!loading && terminatingThisMonth.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Contracts terminating in {format(currentDate, "MMMM yyyy")}
              </h3>
              <ul className="space-y-2">
                {terminatingThisMonth.map(({ contract, endDate, carLabel, customerName }) => (
                  <li
                    key={contract.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm py-1.5 px-3 rounded-md bg-amber-500/10 border border-amber-500/20"
                  >
                    <span className="font-medium">
                      {carLabel} – {customerName}
                    </span>
                    <span className="text-muted-foreground">
                      ends {format(endDate, "EEEE d MMM yyyy")}
                    </span>
                    {contract.contractNumber && (
                      <span className="text-xs text-muted-foreground">
                        ({contract.contractNumber})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading planner…</p>
          ) : (
            <div className="h-[550px] sm:h-[700px] lg:h-[800px] rounded-md border bg-background p-2">
              <BigCalendar
                localizer={localizer}
                events={filteredEvents}
                view={view}
                onView={(nextView) => setView(nextView)}
                date={currentDate}
                onNavigate={(nextDate) => setCurrentDate(nextDate)}
                defaultView={Views.MONTH}
                views={[Views.MONTH]}
                startAccessor="start"
                endAccessor="end"
                popup
                onSelectEvent={(event) =>
                  setSelectedEvent(event as PlannerEvent)
                }
                eventPropGetter={eventPropGetter}
                tooltipAccessor={undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
      >
        <DialogContent
          className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col"
        >
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4 overflow-y-auto pr-1">
            {/* Car Information Section */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground border-b pb-2">
                Car Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium">Car Name</span>
                    <span className="text-sm font-medium">{selectedCar?.name ?? "Unknown car"}</span>
                  </div>
                  {selectedCar?.plateNumber && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Plate Number</span>
                      <span className="text-sm">{selectedCar.plateNumber}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedCar?.brand && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Brand</span>
                      <span className="text-sm">{selectedCar.brand}</span>
                    </div>
                  )}
                  {selectedCar?.model && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Model</span>
                      <span className="text-sm">{selectedCar.model}</span>
                    </div>
                  )}
                  {(selectedContract?.dailyRate != null) && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Rate per Day</span>
                      <span className="text-sm font-medium">{selectedContract.dailyRate} MUR</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Customer Information Section */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground border-b pb-2">
                Customer Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium">Customer Name</span>
                    <span className="text-sm font-medium">{selectedEvent?.customerName ?? "Unknown customer"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedCustomer?.email && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Email</span>
                      <span className="text-sm">{selectedCustomer.email}</span>
                    </div>
                  )}
                  {selectedCustomer?.phone && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium">Phone</span>
                      <span className="text-sm">{selectedCustomer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t"></div>

            {/* Rental Period Section */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground border-b pb-2">
                Rental Period
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Start Date</span>
                  <span className="text-sm font-medium">
                    {selectedEvent && format(selectedEvent.start as Date, "PPP")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">End Date</span>
                  <span className="text-sm font-medium">
                    {selectedEvent && format(selectedEvent.end as Date, "PPP")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Delivery Place</span>
                  <span className="text-sm">{selectedContract?.pickupPlace ?? "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Delivery Time</span>
                  <span className="text-sm">{selectedContract?.pickupTime ?? "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Recovery Place</span>
                  <span className="text-sm">{selectedContract?.deliveryPlace ?? "-"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">Recovery Time</span>
                  <span className="text-sm">{selectedContract?.deliveryTime ?? "-"}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
