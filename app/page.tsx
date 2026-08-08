import { LandingPadExperience } from "@/components/landingpad/landingpad-experience";
import { getProductMode } from "@/lib/config/product-mode";

export default function Home() {
  return <LandingPadExperience mode={getProductMode()} />;
}
