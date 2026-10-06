import { StageScreen } from '@/components/stage/StageScreen';

export default async function StagePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <StageScreen code={code} />;
}
