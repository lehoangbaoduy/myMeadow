import { getViewMode } from "@/lib/view-mode";
import PersonalInventoryClient from "./PersonalInventoryClient";
import MobilePersonalInventoryClient from "@/components/mobile/MobilePersonalInventoryClient";

export default async function PersonalInventoryPage() {
  const isMobile = (await getViewMode()) === "mobile";
  return isMobile ? <MobilePersonalInventoryClient /> : <PersonalInventoryClient />;
}
