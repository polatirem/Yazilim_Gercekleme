import type { Metadata } from "next";
import { PlaygroundRoute } from "./PlaygroundRoute";

export const metadata: Metadata = { title: "Oyun Alanı" };

export default function PlaygroundPage() {
  return <PlaygroundRoute />;
}
