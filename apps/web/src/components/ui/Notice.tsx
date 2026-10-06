import type { CSSProperties, ReactNode } from 'react';

interface Props {
  title?: string;
  children?: ReactNode;
  /** Background/text colors when the notice sits on a player's color or the stage blue. */
  style?: CSSProperties;
}

export function Notice({ title, children, style }: Props) {
  const onColor = Boolean(style);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center" style={style}>
      {title && <h1 className={`font-display text-4xl ${onColor ? '' : 'text-brand-deep'}`}>{title}</h1>}
      {children && <p className={`text-lg ${onColor ? 'font-medium' : 'text-muted'}`}>{children}</p>}
    </div>
  );
}
