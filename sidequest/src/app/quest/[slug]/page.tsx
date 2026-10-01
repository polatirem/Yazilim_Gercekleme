import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTENT } from "@/content";
import { QuestBySlug } from "./QuestBySlug";

export function generateStaticParams() {
  return CONTENT.quests.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/quest/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: CONTENT.questBySlug.get(slug)?.title ?? "Görev" };
}

export default async function QuestDetailPage({ params }: PageProps<"/quest/[slug]">) {
  const { slug } = await params;
  if (!CONTENT.questBySlug.has(slug)) notFound();
  return <QuestBySlug slug={slug} />;
}
