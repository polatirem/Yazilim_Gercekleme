import type { Metadata } from "next";
import { WorldRoute } from "@/components/world/WorldRoute";

export const metadata: Metadata = { title: "Şehir" };

export default function WorldPage() {
  return <WorldRoute />;
}
