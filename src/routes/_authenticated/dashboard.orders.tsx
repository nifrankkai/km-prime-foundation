import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";

import { LicenseBanner } from "@/components/dashboard/license-banner";
import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { useMemberOverview } from "@/hooks/use-member-overview";
import { confirmOrderReceived, listOrders } from "@/lib/commerce.functions";
import { money, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { data: overview } = useMemberOverview();
  const fetchOrders = useServerFn(listOrders);
  const confirm = useServerFn(confirmOrderReceived);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
  });

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => confirm({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Delivery confirmed — thank you!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <LicenseBanner overview={overview} />
      <PanelCard title="Orders" description="Track your KM Prime purchases, PV earned and delivery status.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your orders…</p>
        ) : (orders ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">You have not placed an order yet.</p>
            <Button asChild variant="prime" className="mt-5">
              <Link to="/shop">Shop the catalogue</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(orders ?? []).map((order) => (
              <article key={order.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-foreground">{order.reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} •{" "}
                      {titleCase(order.paymentMethod)} • {titleCase(order.paymentState)}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">
                    {titleCase(order.status)}
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 text-muted-foreground">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>
                        {money(item.unitPriceCents * item.quantity)} • {item.pv * item.quantity} PV
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm font-extrabold text-foreground">
                    Total {money(order.totalCents)} • {order.totalPv} PV
                  </p>
                  {order.status === "shipped" && (
                    <Button
                      variant="prime"
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate(order.id)}
                    >
                      <PackageCheck /> Confirm product received
                    </Button>
                  )}
                  {order.deliveredAt && (
                    <p className="text-xs font-semibold text-primary">
                      Delivered {new Date(order.deliveredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
