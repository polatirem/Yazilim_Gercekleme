import type { Metadata } from "next";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Başla" };

export default function BeginPage() {
  return <Onboarding />;
}
