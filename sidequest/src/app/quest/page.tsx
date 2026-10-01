import type { Metadata } from "next";
import { QuestRoute } from "./QuestRoute";

export const metadata: Metadata = { title: "Bana bir görev ver" };

export default async function QuestPage({ searchParams }: PageProps<"/quest">) {
  const params = await searchParams;
  return <QuestRoute mystery={params.mystery === "1"} />;
}
