import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useTabs } from '../../../src/hooks/useTabs';
import { Provider } from 'react-redux';
import { store } from '../../../src/store/store';

// Mock the Redux store
const mockDispatch = jest.fn();
const mockUseAppSelector = jest.fn((selector: any) => selector({ ui: { selectedTab: 0 } }));

jest.mock('../../../src/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockUseAppSelector(selector),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(Provider, { store, children });
};

describe('useTabs Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      expect(result.current.selectedTab).toBe(0);
      expect(result.current.changeTab).toBeInstanceOf(Function);
      expect(result.current.nextTab).toBeInstanceOf(Function);
      expect(result.current.previousTab).toBeInstanceOf(Function);
      expect(result.current.goToFirstTab).toBeInstanceOf(Function);
      expect(result.current.goToLastTab).toBeInstanceOf(Function);
    });
  });

  describe('Tab Selection', () => {
    it('should call dispatch when changing tab', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.changeTab(2);
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 2,
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should go to next tab', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.nextTab();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 1,
      });
    });

    it('should go to previous tab', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.previousTab();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 2,
      });
    });

    it('should go to first tab', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.goToFirstTab();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 0,
      });
    });

    it('should go to last tab', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.goToLastTab();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 2,
      });
    });
  });

  describe('Tab Wrapping', () => {
    it('should wrap to first tab when going next from last tab', () => {
      // Mock selectedTab as 2 (last tab)
      mockUseAppSelector.mockImplementation((selector: any) => selector({ ui: { selectedTab: 2 } }));

      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.nextTab();
      });

      // When selectedTab is 2, nextTab should go to (2+1)%3 = 0
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 0,
      });
    });

    it('should wrap to last tab when going previous from first tab', () => {
      // Mock selectedTab as 0 (first tab)
      mockUseAppSelector.mockImplementation((selector: any) => selector({ ui: { selectedTab: 0 } }));

      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.previousTab();
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/setSelectedTab',
        payload: 2,
      });
    });
  });

  describe('Callback Dependencies', () => {
    it('should memoize callbacks correctly', () => {
      const { result, rerender } = renderHook(() => useTabs(), { wrapper });

      const firstRender = {
        changeTab: result.current.changeTab,
        nextTab: result.current.nextTab,
        previousTab: result.current.previousTab,
        goToFirstTab: result.current.goToFirstTab,
        goToLastTab: result.current.goToLastTab,
      };

      rerender();

      const secondRender = {
        changeTab: result.current.changeTab,
        nextTab: result.current.nextTab,
        previousTab: result.current.previousTab,
        goToFirstTab: result.current.goToFirstTab,
        goToLastTab: result.current.goToLastTab,
      };

      // Callbacks should be memoized (same reference)
      expect(firstRender.changeTab).toBe(secondRender.changeTab);
      expect(firstRender.nextTab).toBe(secondRender.nextTab);
      expect(firstRender.previousTab).toBe(secondRender.previousTab);
      expect(firstRender.goToFirstTab).toBe(secondRender.goToFirstTab);
      expect(firstRender.goToLastTab).toBe(secondRender.goToLastTab);
    });
  });

  describe('Multiple Calls', () => {
    it('should handle multiple rapid calls', () => {
      const { result } = renderHook(() => useTabs(), { wrapper });

      act(() => {
        result.current.nextTab();
        result.current.nextTab();
        result.current.previousTab();
      });

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });
  });
});