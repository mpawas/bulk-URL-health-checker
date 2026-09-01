import { BatchEventSchema } from "@url-checker/shared";
import { notFound } from "next/navigation";
import { serverApiUrl } from "@/lib/api";
import { BatchLive } from "./batch-live";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchPage({ params }: PageProps) {
  const { id } = await params;
  const response = await fetch(`${serverApiUrl()}/batches/${id}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error(`failed to load batch ${id}: ${response.status}`);
  }

  const initial = BatchEventSchema.parse(await response.json());
  return <BatchLive batchId={id} initial={initial} />;
}
