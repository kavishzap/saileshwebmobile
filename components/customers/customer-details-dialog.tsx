"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/types";

type CustomerDetailsDialogProps = {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
};

export function CustomerDetailsDialog({
  open,
  customer,
  onClose,
}: CustomerDetailsDialogProps) {
  if (!customer) return null;

  const fullAddressParts = [
    customer.address?.trim() || "",
    customer.city?.trim() || "",
    customer.country?.trim() || "",
  ].filter(Boolean);

  const fullAddress =
    fullAddressParts.length > 0 ? fullAddressParts.join(", ") : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg px-6 py-6 sm:px-8 sm:py-7">
        <DialogHeader>
          <DialogTitle>
            {customer.firstName} {customer.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Email
              </div>
              <div>{customer.email || "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Phone
              </div>
              <div>{customer.phone || "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                NIC / Passport
              </div>
              <div>{customer.nicOrPassport || "—"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Driving license
              </div>
              <div>{customer.license || "—"}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Full address
            </div>
            <div>{fullAddress}</div>
          </div>

          {customer.notes && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Notes
              </div>
              <p className="whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

