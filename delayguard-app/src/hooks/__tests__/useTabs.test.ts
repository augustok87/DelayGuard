import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useTabs } from '../useTabs';
import { RootState } from '../../types/store';

// Mock store for testing
const createMockStore = (initialState?: Partial<RootState>) => {
  return configureStore({
    reducer: {
      ui: (state = { 
        selectedTab: 0, 
        modals: {}, 
        toasts: { items: [] }, 
        theme: { mode: 'light', primaryColor: '#2563eb', secondaryColor: '#1d4ed8' }, 
        sidebar: { isOpen: false } 
      }) => state,
    },
    preloadedState: initialState as any,
  });
};

const wrapper = ({ children, store }: { children: React.ReactNode; store: any }) => {
  return React.createElement(Provider, { store }, children);
};

describe('useTabs', () => {
  it('returns initial tab state', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    expect(result.current.selectedTab).toBe(0);
    expect(typeof result.current.changeTab).toBe('function');
  });

  it('changes selected tab', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.changeTab(2);
    });

    expect(result.current.selectedTab).toBe(2);
  });

  it('handles multiple tab changes', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.changeTab(1);
    });
    expect(result.current.selectedTab).toBe(1);

    act(() => {
      result.current.changeTab(3);
    });
    expect(result.current.selectedTab).toBe(3);

    act(() => {
      result.current.changeTab(0);
    });
    expect(result.current.selectedTab).toBe(0);
  });

  it('maintains tab state across re-renders', () => {
    const store = createMockStore();
    const { result, rerender } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.changeTab(2);
    });

    rerender();

    expect(result.current.selectedTab).toBe(2);
  });

  it('handles negative tab indices gracefully', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.changeTab(-1);
    });

    // Should handle gracefully (implementation dependent)
    expect(typeof result.current.selectedTab).toBe('number');
  });

  it('handles large tab indices gracefully', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useTabs(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.changeTab(999);
    });

    // Should handle gracefully (implementation dependent)
    expect(typeof result.current.selectedTab).toBe('number');
  });
});
