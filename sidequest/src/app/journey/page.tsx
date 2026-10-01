import type { Metadata } from "next";
import { JourneyRoute } from "./JourneyRoute";

export const metadata: Metadata = { title: "Yolculuk" };

export default function JourneyPage() {
  return <JourneyRoute />;
}
