import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createSafeAsyncFunction } from '../utils/error-handler';
import { logInfo } from '../utils/logger';
import type { RootState, AppDispatch } from '../store/store';
import type { AsyncThunk } from '@reduxjs/toolkit';

/**
 * Generic hook for managing async resources with Redux
 * Reduces code duplication across useDelayAlerts, useOrders, useSettings, etc.
 */
export function useAsyncResource<T>(
  resourceName: string,
  fetchAction: AsyncThunk<T[], unknown, { state: RootState; dispatch: AppDispatch }>,
  updateAction: AsyncThunk<{ id: string; updates: Partial<T> }, { id: string; updates: Partial<T> }, { state: RootState; dispatch: AppDispatch }>,
  deleteAction: AsyncThunk<string, string, { state: RootState; dispatch: AppDispatch }>,
  selector: (state: RootState) => { items: T[]; loading: boolean; error: string | null },
  createAction?: AsyncThunk<T, unknown, { state: RootState; dispatch: AppDispatch }>,
) {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(selector);

  // Load items on mount
  useEffect(() => {
    dispatch(fetchAction(undefined));
  }, [dispatch, fetchAction]);

  // Create new item
  const createItem = useCallback(
    createSafeAsyncFunction(
      async(itemData: Partial<T>): Promise<{ success: true }> => {
        if (createAction) {
          await dispatch(createAction(itemData)).unwrap();
          logInfo(`Created ${resourceName}`, { itemData });
          return { success: true };
        } else {
          logInfo(`Creating ${resourceName}`, { itemData });
          return { success: true };
        }
      },
      { component: 'useAsyncResource', action: 'createItem', resourceName },
    ),
    [dispatch, createAction, resourceName],
  );

  // Update existing item
  const updateItem = useCallback(
    createSafeAsyncFunction(
      async(id: string, updates: Partial<T>): Promise<{ success: true }> => {
        await dispatch(updateAction({ id, updates })).unwrap();
        logInfo(`Updated ${resourceName}`, { id, updates });
        return { success: true };
      },
      { component: 'useAsyncResource', action: 'updateItem', resourceName },
    ),
    [dispatch, updateAction, resourceName],
  );

  // Delete existing item
  const deleteItem = useCallback(
    createSafeAsyncFunction(
      async(id: string): Promise<{ success: true }> => {
        await dispatch(deleteAction(id)).unwrap();
        logInfo(`Deleted ${resourceName}`, { id });
        return { success: true };
      },
      { component: 'useAsyncResource', action: 'deleteItem', resourceName },
    ),
    [dispatch, deleteAction, resourceName],
  );

  // Refresh items
  const refreshItems = useCallback(() => {
    dispatch(fetchAction(undefined));
  }, [dispatch, fetchAction]);

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refreshItems,
  };
}

/**
 * Generic hook for filtering and sorting items
 */
export function useItemFilters<T>(
  items: T[],
  getStatus: (item: T) => string,
  getPriority?: (item: T) => string,
) {
  // Filter by status
  const getItemsByStatus = useCallback((status: string) => {
    return items.filter(item => getStatus(item) === status);
  }, [items, getStatus]);

  // Filter by priority (if available)
  const getItemsByPriority = useCallback((priority: string) => {
    if (!getPriority) return [];
    return items.filter(item => getPriority(item) === priority);
  }, [items, getPriority]);

  // Search items by text
  const searchItems = useCallback((searchText: string, searchFields: (keyof T)[]) => {
    if (!searchText.trim()) return items;
    
    const lowerSearchText = searchText.toLowerCase();
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(lowerSearchText);
      }),
    );
  }, [items]);

  // Sort items
  const sortItems = useCallback((sortBy: keyof T, direction: 'asc' | 'desc' = 'asc') => {
    return [...items].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items]);

  return {
    getItemsByStatus,
    getItemsByPriority,
    searchItems,
    sortItems,
  };
}
