import { getViewMode } from "@/lib/view-mode";
import KitchenInventoryClient from "./KitchenInventoryClient";
import MobileKitchenInventoryClient from "@/components/mobile/MobileKitchenInventoryClient";

export default async function KitchenInventoryPage() {
  const isMobile = (await getViewMode()) === "mobile";
  return isMobile ? <MobileKitchenInventoryClient /> : <KitchenInventoryClient />;
}
