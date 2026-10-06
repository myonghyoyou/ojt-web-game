import { PlayerScreen } from '@/components/player/PlayerScreen';

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerScreen code={code} />;
}
