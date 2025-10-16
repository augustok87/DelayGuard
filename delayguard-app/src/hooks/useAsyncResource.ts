import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';

/**
 * Generic hook for managing async resources with Redux
 * Reduces code duplication across useDelayAlerts, useOrders, useSettings, etc.
 */
export function useAsyncResource<T>(
  resourceName: string,
  fetchAction: any,
  updateAction: any,
  deleteAction: any,
  selector: (state: any) => { items: T[]; loading: boolean; error: string | null },
  createAction?: any
) {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(selector);

  // Load items on mount
  useEffect(() => {
    dispatch(fetchAction());
  }, [dispatch, fetchAction]);

  // Create new item
  const createItem = useCallback(async (itemData: any) => {
    try {
      if (createAction) {
        await dispatch(createAction(itemData)).unwrap();
        return { success: true };
      } else {
        console.log(`Creating ${resourceName}:`, itemData);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch, createAction, resourceName]);

  // Update existing item
  const updateItem = useCallback(async (id: string, updates: any) => {
    try {
      await dispatch(updateAction({ id, updates })).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch, updateAction]);

  // Delete existing item
  const deleteItem = useCallback(async (id: string) => {
    try {
      await dispatch(deleteAction(id)).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch, deleteAction]);

  // Refresh items
  const refreshItems = useCallback(() => {
    dispatch(fetchAction());
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
  getPriority?: (item: T) => string
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
      })
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
