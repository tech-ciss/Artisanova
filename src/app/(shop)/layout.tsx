import { ShopHeader, ShopFooter } from "@/components/features/shop-shell";
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <><ShopHeader />{children}<ShopFooter /></>;
}
