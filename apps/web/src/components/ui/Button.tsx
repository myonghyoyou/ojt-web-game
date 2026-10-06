'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ink';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-deep text-white active:bg-brand-mid disabled:bg-gray-300 disabled:text-gray-500',
  secondary: 'border-2 border-brand-deep bg-white text-brand-deep disabled:opacity-40',
  ghost: 'bg-transparent text-current underline underline-offset-4',
  /** On a player's color: near-black button reads on every swatch. */
  ink: 'bg-night text-white active:opacity-90 disabled:opacity-40',
  danger: 'border-2 border-red-200 bg-white text-red-600 disabled:opacity-40',
};

export function Button({ variant = 'primary', className = '', ...props }: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`min-h-12 w-full rounded-2xl px-5 text-lg font-bold transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
