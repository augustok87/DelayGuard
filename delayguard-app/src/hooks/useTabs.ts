import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedTab } from '../store/slices/uiSlice';

export const useTabs = () => {
  const dispatch = useAppDispatch();
  const selectedTab = useAppSelector(state => state.ui.selectedTab);

  const changeTab = useCallback((tabIndex: number) => {
    dispatch(setSelectedTab(tabIndex));
  }, [dispatch]);

  const nextTab = useCallback(() => {
    const nextIndex = (selectedTab + 1) % 3; // Assuming 3 tabs
    changeTab(nextIndex);
  }, [selectedTab, changeTab]);

  const previousTab = useCallback(() => {
    const prevIndex = selectedTab === 0 ? 2 : selectedTab - 1; // Assuming 3 tabs
    changeTab(prevIndex);
  }, [selectedTab, changeTab]);

  const goToFirstTab = useCallback(() => {
    changeTab(0);
  }, [changeTab]);

  const goToLastTab = useCallback(() => {
    changeTab(2); // Assuming 3 tabs
  }, [changeTab]);

  return {
    selectedTab,
    changeTab,
    nextTab,
    previousTab,
    goToFirstTab,
    goToLastTab,
  };
};
