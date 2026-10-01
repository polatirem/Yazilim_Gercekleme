import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevPanel } from "@/components/dev/DevPanel";
import { demoToolsEnabled } from "./enabled";

export const metadata: Metadata = { title: "Demo araçları", robots: { index: false } };

export default async function DevPage() {
  // Evaluated per request so a production deployment never serves these tools by accident.
  if (!demoToolsEnabled()) notFound();
  return <DevPanel />;
}

export const dynamic = "force-dynamic";
