import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { adminSetStock, listAdminProducts } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/inventory")({
  component: AdminInventory,
});

function AdminInventory() {
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listAdminProducts);
  const setStock = useServerFn(adminSetStock);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { productId: string; stock: number }) => setStock({ data: vars }),
    onSuccess: () => {
      toast.success("Stock updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PanelCard title="Stock control" description="Stockist view for inventory levels.">
      {isLoading && <p className="text-sm text-muted-foreground">Loading inventory…</p>}
      <div className="space-y-3">
        {products?.map((product) => (
          <div
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.category} · {product.stock_quantity} in stock
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  mutation.mutate({
                    productId: product.id,
                    stock: Math.max(0, product.stock_quantity - 10),
                  })
                }
              >
                −10
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  mutation.mutate({ productId: product.id, stock: product.stock_quantity + 10 })
                }
              >
                +10
              </Button>
              <Button
                size="sm"
                variant="prime"
                onClick={() => {
                  const raw = window.prompt("Set stock quantity", String(product.stock_quantity));
                  if (raw === null) return;
                  const stock = Number(raw);
                  if (!Number.isInteger(stock) || stock < 0) {
                    toast.error("Enter a whole number");
                    return;
                  }
                  mutation.mutate({ productId: product.id, stock });
                }}
              >
                Set
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
