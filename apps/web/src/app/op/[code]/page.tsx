import { OperatorScreen } from '@/components/operator/OperatorScreen';

export default async function OperatorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <OperatorScreen code={code} />;
}
