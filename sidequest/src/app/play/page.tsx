import type { Metadata } from "next";
import { PlayRoute } from "./PlayRoute";

export const metadata: Metadata = { title: "Görev" };

export default function PlayPage() {
  return <PlayRoute />;
}
