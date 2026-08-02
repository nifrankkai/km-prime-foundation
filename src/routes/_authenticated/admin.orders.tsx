import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminSetOrderStatus, listAdminOrders } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const flow = [
  "pending_payment",
  "awaiting_approval",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function AdminOrders() {
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listAdminOrders);
  const setStatus = useServerFn(adminSetOrderStatus);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { orderId: string; status: (typeof flow)[number] }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard title="Orders" description="Approve manual payments and move orders through fulfilment.">
      {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
      <div className="space-y-3">
        {orders?.map((order) => (
          <div key={order.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{order.reference}</p>
                <p className="text-sm text-muted-foreground">
                  {order.full_name} · {order.city}, {order.country}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {order.status.replace("_", " ")} · {order.payment_method.replace("_", " ")} ·{" "}
                  {order.payment_state.replace("_", " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-primary">{money(order.total_cents)}</p>
                <p className="text-xs text-muted-foreground">{order.total_pv} PV</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {flow.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={order.status === status ? "prime" : "outline"}
                  onClick={() => mutation.mutate({ orderId: order.id, status })}
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
