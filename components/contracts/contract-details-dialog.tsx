// src/components/contracts/contract-details-dialog.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Contract } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { updateContract } from "@/lib/services/contracts";
import { useToast } from "@/hooks/use-toast";

type ContractDetails = Contract & {
  customerName?: string;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerCountry?: string | null;
  carName?: string;
  carPlateNumber?: string;
};

type ContractDetailsDialogProps = {
  open: boolean;
  contract: ContractDetails | null;
  onClose: () => void;
};

export function ContractDetailsDialog({
  open,
  contract,
  onClose,
}: ContractDetailsDialogProps) {
  if (!contract) return null;

  const { toast } = useToast();
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    (contract as any).clientSignatureBase64 ?? null
  );
  const [fuelAmount, setFuelAmount] = useState<number>(
    (contract as any).fuelAmount ?? 0
  );
  const [savingFuel, setSavingFuel] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const simAmount = (contract as any).simAmount ?? 0;
  const deliveryAmount = (contract as any).deliveryAmount ?? 0;
  const cardPaymentPercent = (contract as any).cardPaymentPercent ?? 0;
  const cardPaymentAmount = (contract as any).cardPaymentAmount ?? 0;
  const taxRate = contract.taxRate ?? 0;

  useEffect(() => {
    setSignatureDataUrl((contract as any).clientSignatureBase64 ?? null);
    setFuelAmount((contract as any).fuelAmount ?? 0);
  }, [contract]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const handleCanvasDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827"; // gray-900
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const handleCanvasUp = () => {
    isDrawing.current = false;
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl) return;

    try {
      setSavingSignature(true);
      await updateContract(contract.id, {
        clientSignatureBase64: dataUrl,
      } as any);
      setSignatureDataUrl(dataUrl);
      toast({
        title: "Signature saved",
        description: "Client signature has been stored on this contract.",
      });
    } catch (err: any) {
      toast({
        title: "Could not save signature",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleClearSignature = async () => {
    clearCanvas();
    try {
      setSavingSignature(true);
      await updateContract(contract.id, {
        clientSignatureBase64: null,
      } as any);
      setSignatureDataUrl(null);
      toast({
        title: "Signature cleared",
        description: "Client signature has been removed from this contract.",
      });
    } catch (err: any) {
      toast({
        title: "Could not clear signature",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleSaveFuel = async () => {
    try {
      setSavingFuel(true);
      await updateContract(contract.id, {
        fuelAmount,
      } as any);
      toast({
        title: "Fuel updated",
        description: "Fuel amount has been updated for this contract.",
      });
    } catch (err: any) {
      toast({
        title: "Could not update fuel",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingFuel(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] w-full sm:w-[90vw] max-w-2xl overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
        <DialogHeader>
          <DialogTitle>
            Contract {contract.contractNumber ?? ""} details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Customer
              </div>
              <div className="text-sm">
                {contract.customerName ?? "Unknown customer"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Car
              </div>
              <div className="text-sm">
                {contract.carName ?? "Unknown car"}
                {contract.carPlateNumber && (
                  <span className="text-muted-foreground ml-1">
                    ({contract.carPlateNumber})
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Start date
              </div>
              <div className="text-sm">
                {formatDate(contract.startDate)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                End date
              </div>
              <div className="text-sm">
                {formatDate(contract.endDate)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Days
              </div>
              <div className="text-sm">
                {contract.days}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Daily rate
              </div>
              <div className="text-sm">
                {formatCurrency(contract.dailyRate)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Total
              </div>
              <div className="text-sm font-medium">
                {formatCurrency(contract.total)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Status
              </div>
              <Badge className="mt-0.5">
                {contract.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fuel amount
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Set the current fuel level (bars)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={fuelAmount || 0}
                  onChange={(e) => setFuelAmount(Number.parseInt(e.target.value, 10) || 0)}
                >
                  <option value={0}>0</option>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const v = idx + 1;
                    return (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    );
                  })}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveFuel}
                  disabled={savingFuel}
                >
                  {savingFuel ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Delivery place
              </div>
              <div className="text-sm">
                {contract.pickupPlace || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Delivery time
              </div>
              <div className="text-sm">
                {contract.pickupTime || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Recovery place
              </div>
              <div className="text-sm">
                {contract.deliveryPlace || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Recovery time
              </div>
              <div className="text-sm">
                {contract.deliveryTime || "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Customer address
            </div>
            <div className="text-sm">
              {(() => {
                const parts = [
                  contract.customerAddress?.trim() || "",
                  contract.customerCity?.trim() || "",
                  contract.customerCountry?.trim() || "",
                ].filter(Boolean);
                return parts.length ? parts.join(", ") : "—";
              })()}
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount breakdown
            </div>
            <div className="mt-1 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal (days × daily rate)</span>
                <span className="font-medium">
                  {formatCurrency(contract.subtotal ?? contract.total)}
                </span>
              </div>

              {taxRate > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax ({taxRate}%)</span>
                  <span>
                    {formatCurrency(
                      (contract.subtotal ?? 0) * (taxRate / 100)
                    )}
                  </span>
                </div>
              )}

              {(simAmount || deliveryAmount) > 0 && (
                <div className="pt-1">
                  {simAmount > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>SIM + Internet</span>
                      <span>{formatCurrency(simAmount)}</span>
                    </div>
                  )}
                  {deliveryAmount > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Delivery amount</span>
                      <span>{formatCurrency(deliveryAmount)}</span>
                    </div>
                  )}
                </div>
              )}

              {cardPaymentPercent > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Card fee ({cardPaymentPercent}%)</span>
                  <span>{formatCurrency(cardPaymentAmount)}</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                <span className="font-semibold">Total</span>
                <span className="text-base font-semibold">
                  {formatCurrency(contract.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">
                Client signature
              </div>
              {signatureDataUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleClearSignature}
                  disabled={savingSignature}
                >
                  Clear
                </Button>
              )}
            </div>

            {signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureDataUrl}
                alt="Client signature"
                className="h-32 w-full rounded border bg-white object-contain p-2"
              />
            ) : (
              <div className="space-y-2">
                <div className="h-40 w-full rounded border bg-white touch-none">
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full"
                    width={800}
                    height={200}
                    onMouseDown={handleCanvasDown}
                    onMouseMove={handleCanvasMove}
                    onMouseUp={handleCanvasUp}
                    onMouseLeave={handleCanvasUp}
                    onTouchStart={handleCanvasDown}
                    onTouchMove={handleCanvasMove}
                    onTouchEnd={handleCanvasUp}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    disabled={savingSignature}
                  >
                    Clear drawing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSignature}
                    disabled={savingSignature}
                  >
                    {savingSignature ? "Saving…" : "Save signature"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                License number
              </div>
              <div className="text-sm">
                {contract.licenseNumber || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Customer NIC / Passport
              </div>
              <div className="text-sm">
                {contract.customerNicOrPassport || "—"}
              </div>
            </div>
          </div>

          {contract.notes && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                Notes
              </div>
              <p className="whitespace-pre-wrap text-sm">
                {contract.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

