import { createFileRoute } from "@tanstack/react-router";
import HousingAdsAggregatorPanel from "@/components/HousingAdsAggregatorPanel";

export const Route = createFileRoute("/_authenticated/housing-ads")({
  component: HousingAdsPage,
});

function HousingAdsPage() {
  return <HousingAdsAggregatorPanel />;
}
