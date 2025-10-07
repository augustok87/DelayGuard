import { renderHook, act } from '@testing-library/react';
import { useAsync } from '../../../src/hooks/useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const mockAsyncFunction = jest.fn();
    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should execute async function and update state', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function errors', async () => {
    const mockError = new Error('Test error');
    const mockAsyncFunction = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should pass arguments to async function', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      await result.current.execute('arg1', 'arg2', { key: 'value' });
    });

    expect(mockAsyncFunction).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    expect(result.current.data).toEqual(mockData);
  });

  it('should set loading state during execution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const mockAsyncFunction = jest.fn().mockReturnValue(promise);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolvePromise!({ id: 1, name: 'Test' });
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should not update state if component is unmounted', async () => {
    const mockData = { id: 1, name: 'Test' };
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    const mockAsyncFunction = jest.fn().mockReturnValue(promise);

    const { result, unmount } = renderHook(() => useAsync(mockAsyncFunction));

    act(() => {
      result.current.execute();
    });

    unmount();

    await act(async () => {
      resolvePromise!(mockData);
      await promise;
    });

    // State should not be updated after unmount
    expect(result.current.data).toBeNull();
  });

  it('should reset state when reset is called', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not reset state on execute when resetOnExecute is false', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction, { resetOnExecute: false }));

    // Set initial state
    act(() => {
      result.current.execute();
    });

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
  });

  it('should execute immediately when immediate option is true', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    renderHook(() => useAsync(mockAsyncFunction, { immediate: true }));

    await act(async () => {
      // Wait for immediate execution
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple executions', async () => {
    const mockData1 = { id: 1, name: 'Test 1' };
    const mockData2 = { id: 2, name: 'Test 2' };
    const mockAsyncFunction = jest.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData1);

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData2);
    expect(mockAsyncFunction).toHaveBeenCalledTimes(2);
  });

  it('should handle concurrent executions', async () => {
    const mockData1 = { id: 1, name: 'Test 1' };
    const mockData2 = { id: 2, name: 'Test 2' };
    const mockAsyncFunction = jest.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    // Start two concurrent executions
    act(() => {
      result.current.execute();
      result.current.execute();
    });

    await act(async () => {
      // Wait for both to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockAsyncFunction).toHaveBeenCalledTimes(2);
  });

  it('should handle async function that throws synchronously', async () => {
    const mockError = new Error('Sync error');
    const mockAsyncFunction = jest.fn().mockImplementation(() => {
      throw mockError;
    });

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle async function that returns non-promise', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFunction = jest.fn().mockReturnValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns null', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns undefined', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns false', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns 0', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue(0);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns empty string', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue('');

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns empty array', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function that returns empty object', async () => {
    const mockAsyncFunction = jest.fn().mockResolvedValue({});

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function with complex return type', async () => {
    const mockData = {
      id: 1,
      name: 'Test',
      items: [{ id: 1, value: 'test' }],
      metadata: { created: new Date(), updated: new Date() }
    };
    const mockAsyncFunction = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function with different error types', async () => {
    const customError = new Error('Custom error');
    customError.name = 'CustomError';
    const mockAsyncFunction = jest.fn().mockRejectedValue(customError);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(customError);
    expect(result.current.error?.name).toBe('CustomError');
  });

  it('should handle async function with string error', async () => {
    const mockAsyncFunction = jest.fn().mockRejectedValue('String error');

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error('String error'));
  });

  it('should handle async function with object error', async () => {
    const objectError = { message: 'Object error', code: 500 };
    const mockAsyncFunction = jest.fn().mockRejectedValue(objectError);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Error is expected to be thrown
      }
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(new Error('[object Object]'));
  });
});
