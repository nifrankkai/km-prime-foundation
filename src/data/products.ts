import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export type Product = {
  id: string;
  name: string;
  tag: string;
  retail: string;
  member: string;
  image: string;
};

export const products: Product[] = [
  {
    id: "daily-defense",
    name: "Daily Defense Capsules",
    tag: "Immunity",
    retail: "RM 189",
    member: "RM 132",
    image: product1,
  },
  {
    id: "radiance-collagen",
    name: "Radiance Collagen Blend",
    tag: "Beauty",
    retail: "RM 249",
    member: "RM 174",
    image: product2,
  },
  {
    id: "clarity-oil",
    name: "Clarity Botanical Oil",
    tag: "Focus",
    retail: "RM 159",
    member: "RM 111",
    image: product3,
  },
  {
    id: "starter-set",
    name: "Prime Starter Set",
    tag: "Bundle",
    retail: "RM 520",
    member: "RM 349",
    image: product4,
  },
];
