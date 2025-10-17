import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../../../src/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 100));

    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 100 });
    expect(result.current).toBe('initial'); // Should still be initial

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle multiple rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } },
    );

    expect(result.current).toBe('initial');

    // Rapid changes
    rerender({ value: 'change1', delay: 100 });
    rerender({ value: 'change2', delay: 100 });
    rerender({ value: 'change3', delay: 100 });

    expect(result.current).toBe('initial'); // Should still be initial

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('change3'); // Should be the last value
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle negative delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: -100 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: -100 });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle different data types', () => {
    // String
    const { result: stringResult, rerender: stringRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } },
    );

    stringRerender({ value: 'updated', delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(stringResult.current).toBe('updated');

    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 100 } },
    );

    numberRerender({ value: 42, delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(numberResult.current).toBe(42);

    // Boolean
    const { result: booleanResult, rerender: booleanRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: false, delay: 100 } },
    );

    booleanRerender({ value: true, delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(booleanResult.current).toBe(true);

    // Object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { id: 1 }, delay: 100 } },
    );

    objectRerender({ value: { id: 2 }, delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(objectResult.current).toEqual({ id: 2 });

    // Array
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: [1, 2, 3], delay: 100 } },
    );

    arrayRerender({ value: [4, 5, 6], delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(arrayResult.current).toEqual([4, 5, 6]);
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: null, delay: 100 } },
    );

    expect(result.current).toBeNull();

    rerender({ value: undefined as any, delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBeUndefined();

    rerender({ value: null, delay: 100 });
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBeNull();
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } },
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 200 });
    expect(result.current).toBe('initial'); // Should still be initial

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('initial'); // Should still be initial (delay is now 200)

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('initial', 100));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });

  it('should handle multiple rapid calls', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('call1');
      result.current('call2');
      result.current('call3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      result.current('call4');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call4');
  });

  it('should handle zero delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 0));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should handle negative delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, -100));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should handle callback with multiple arguments', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1', 'arg2', { key: 'value' });
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
  });

  it('should handle callback with no arguments', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith();
  });

  it('should handle callback that returns a value', () => {
    const callback = jest.fn().mockReturnValue('return value');
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    let returnValue;
    act(() => {
      returnValue = result.current('arg1');
    });

    expect(returnValue).toBeUndefined(); // Debounced callback doesn't return value immediately

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should handle callback that throws an error', () => {
    const callback = jest.fn().mockImplementation(() => {
      throw new Error('Callback error');
    });
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should handle callback with different delay values', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { callback, delay: 100 } },
    );

    act(() => {
      result.current('arg1');
    });

    rerender({ callback, delay: 200 });

    act(() => {
      result.current('arg2');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg2');
  });

  it('should cleanup timeout on unmount', () => {
    const callback = jest.fn();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1');
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should handle callback changes', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { callback: callback1, delay: 100 } },
    );

    act(() => {
      result.current('arg1');
    });

    rerender({ callback: callback2, delay: 100 });

    act(() => {
      result.current('arg2');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith('arg2');
  });

  it('should handle callback with async function', async() => {
    const callback = jest.fn().mockResolvedValue('async result');
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should handle callback with promise rejection', async() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const callback = jest.fn().mockImplementation(() => {
      return Promise.reject(new Error('Promise error'));
    });
    const { result } = renderHook(() => useDebouncedCallback(callback, 100));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Wait a bit for the promise rejection to be handled
    await act(async() => {
      jest.advanceTimersByTime(10);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERROR: Promise error'),
    );
    
    consoleSpy.mockRestore();
  }, 15000); // Increase timeout for this test
});
