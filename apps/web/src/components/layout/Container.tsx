import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cx('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />
  );
}
