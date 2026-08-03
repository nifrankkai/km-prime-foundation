import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminUpsertProduct, listAdminProducts } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/products")({
  component: AdminProducts,
});

type Draft = {
  id: string | null;
  slug: string;
  name: string;
  description: string;
  category: string;
  retailPrice: string;
  price: string;
  pv: string;
  image: string;
  stock: string;
  status: "active" | "inactive";
};

const emptyDraft: Draft = {
  id: null,
  slug: "",
  name: "",
  description: "",
  category: "Wellness",
  retailPrice: "0",
  price: "0",
  pv: "0",
  image: "",
  stock: "0",
  status: "active",
};

function AdminProducts() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listAdminProducts);
  const upsert = useServerFn(adminUpsertProduct);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: draft.id,
          slug: draft.slug.trim().toLowerCase(),
          name: draft.name,
          description: draft.description,
          category: draft.category,
          retailPriceCents: Math.round(Number(draft.retailPrice) * 100),
          priceCents: Math.round(Number(draft.price) * 100),
          pv: Number(draft.pv),
          images: draft.image ? [draft.image] : [],
          stockQuantity: Number(draft.stock),
          status: draft.status,
        },
      }),
    onSuccess: () => {
      toast.success("Product saved");
      setDraft(emptyDraft);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <PanelCard
        title={draft.id ? "Edit product" : "New product"}
        description="Name, category, retail and member price, PV and stock."
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <Input placeholder="Name" value={draft.name} onChange={(e) => set("name", e.target.value)} required />
          <Input placeholder="Slug" value={draft.slug} onChange={(e) => set("slug", e.target.value)} required />
          <Input
            placeholder="Category"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            required
          />
          <Input placeholder="Image URL" value={draft.image} onChange={(e) => set("image", e.target.value)} />
          <Input
            type="number"
            step="0.01"
            placeholder="Retail price"
            value={draft.retailPrice}
            onChange={(e) => set("retailPrice", e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Member price"
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
          />
          <Input type="number" placeholder="PV" value={draft.pv} onChange={(e) => set("pv", e.target.value)} />
          <Input
            type="number"
            placeholder="Stock"
            value={draft.stock}
            onChange={(e) => set("stock", e.target.value)}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Description"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={1000}
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="prime" disabled={mutation.isPending}>
              {draft.id ? "Save changes" : "Create product"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => set("status", draft.status === "active" ? "inactive" : "active")}
            >
              Status: {draft.status}
            </Button>
            {draft.id && (
              <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Catalogue" description="Every product, including inactive ones.">
        <div className="space-y-3">
          {products?.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.category} · ${(product.price_cents / 100).toFixed(2)} member ·{" "}
                  {product.pv} PV · stock {product.stock_quantity} · {product.status}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    retailPrice: (product.retail_price_cents / 100).toFixed(2),
                    price: (product.price_cents / 100).toFixed(2),
                    pv: String(product.pv),
                    image: product.images?.[0] ?? "",
                    stock: String(product.stock_quantity),
                    status: product.status as "active" | "inactive",
                  })
                }
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
