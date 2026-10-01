import type { Metadata } from "next";
import { CodexRoute } from "./CodexRoute";

export const metadata: Metadata = { title: "Kodeks" };

export default async function CodexPage({ searchParams }: PageProps<"/codex">) {
  const { entry } = await searchParams;
  return <CodexRoute entry={typeof entry === "string" ? entry : null} />;
}
