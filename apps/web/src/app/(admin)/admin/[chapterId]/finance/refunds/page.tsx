import { PaymentRecords } from "@/components/payment-records";

export default async function RefundsPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  return <PaymentRecords chapterId={chapterId} mode="refund" />;
}
