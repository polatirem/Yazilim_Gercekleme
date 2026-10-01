import type { Metadata } from "next";
import { demoToolsEnabled } from "@/app/dev/enabled";
import { SettingsRoute } from "./SettingsRoute";

export const metadata: Metadata = { title: "Ayarlar" };

export default function SettingsPage() {
  return <SettingsRoute showDevLink={demoToolsEnabled()} />;
}
