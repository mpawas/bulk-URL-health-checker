import { notFound } from "next/navigation";
import { fetchBatchEvent } from "@/lib/batches";
import { BatchLive } from "./batch-live";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchPage({ params }: PageProps) {
  const { id } = await params;
  const initial = await fetchBatchEvent(id);
  if (!initial) {
    notFound();
  }
  return <BatchLive batchId={id} initial={initial} />;
}
