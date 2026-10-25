import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTypedQuery } from './use-typed-query';

describe('useTypedQuery', () => {
  it('starts as what the address says', () => {
    const { result } = renderHook(() => useTypedQuery('studio'));
    expect(result.current[0]).toBe('studio');
  });

  it("is the person's own while they type, even though the address has not changed yet", () => {
    const { result } = renderHook(() => useTypedQuery('studio'));

    act(() => result.current[1]('studio shop'));

    expect(result.current[0]).toBe('studio shop');
  });

  it('follows the address when that changes, replacing what was typed', () => {
    const { result, rerender } = renderHook(({ address }) => useTypedQuery(address), {
      initialProps: { address: 'studio' },
    });
    act(() => result.current[1]('half-typed'));

    rerender({ address: '' });

    expect(result.current[0]).toBe('');
  });

  it('leaves what was typed alone when the address stays the same, however often it renders', () => {
    const { result, rerender } = renderHook(({ address }) => useTypedQuery(address), {
      initialProps: { address: 'studio' },
    });
    act(() => result.current[1]('half-typed'));

    rerender({ address: 'studio' });
    rerender({ address: 'studio' });

    expect(result.current[0]).toBe('half-typed');
  });
});
