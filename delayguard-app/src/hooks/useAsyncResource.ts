import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logInfo, logError } from "../utils/logger";
import type { RootState, AppDispatch } from "../store/store";
import type { AsyncThunk } from "@reduxjs/toolkit";

/**
 * Generic hook for managing async resources with Redux
 * Reduces code duplication across useDelayAlerts, useOrders, useSettings, etc.
 */
export function useAsyncResource<T>(
  resourceName: string,
  fetchAction: AsyncThunk<
    T[],
    void,
    { state: RootState; dispatch: AppDispatch }
  >,
  updateAction: AsyncThunk<
    { id: string; updates: Partial<T> },
    { id: string; updates: Partial<T> },
    { state: RootState; dispatch: AppDispatch }
  >,
  deleteAction: AsyncThunk<
    string,
    string,
    { state: RootState; dispatch: AppDispatch }
  >,
  selector: (state: RootState) => {
    items: T[];
    loading: boolean;
    error: string | null;
  },
  createAction?: AsyncThunk<
    T,
    unknown,
    { state: RootState; dispatch: AppDispatch }
  >,
) {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(selector);

  // Load items on mount
  useEffect(() => {
    dispatch(fetchAction());
  }, [dispatch, fetchAction]);

  // Create new item
  const createItem = useCallback(
    async(itemData: Partial<T>): Promise<{ success: boolean; error?: string }> => {
      try {
        if (createAction) {
          await dispatch(createAction(itemData)).unwrap();
          logInfo(`Created ${resourceName}`, { itemData });
          return { success: true };
        } else {
          logInfo(`Creating ${resourceName}`, { itemData });
          return { success: true };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(`Failed to create ${resourceName}`, error as Error);
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, createAction, resourceName],
  );

  // Update existing item
  const updateItem = useCallback(
    async(id: string, updates: Partial<T>): Promise<{ success: boolean; error?: string }> => {
      try {
        await dispatch(updateAction({ id, updates })).unwrap();
        logInfo(`Updated ${resourceName}`, { id, updates });
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(`Failed to update ${resourceName}`, error as Error);
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, updateAction, resourceName],
  );

  // Delete existing item
  const deleteItem = useCallback(
    async(id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await dispatch(deleteAction(id)).unwrap();
        logInfo(`Deleted ${resourceName}`, { id });
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logError(`Failed to delete ${resourceName}`, error as Error);
        return { success: false, error: errorMessage };
      }
    },
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
  const getItemsByStatus = useCallback(
    (status: string) => {
      return items.filter((item) => getStatus(item) === status);
    },
    [items, getStatus],
  );

  // Filter by priority (if available)
  const getItemsByPriority = useCallback(
    (priority: string) => {
      if (!getPriority) return [];
      return items.filter((item) => getPriority(item) === priority);
    },
    [items, getPriority],
  );

  // Search items by text
  const searchItems = useCallback(
    (searchText: string, searchFields: (keyof T)[]) => {
      if (!searchText.trim()) return items;

      const lowerSearchText = searchText.toLowerCase();
      return items.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(lowerSearchText);
        }),
      );
    },
    [items],
  );

  // Sort items
  const sortItems = useCallback(
    (sortBy: keyof T, direction: "asc" | "desc" = "asc") => {
      return [...items].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
      });
    },
    [items],
  );

  return {
    getItemsByStatus,
    getItemsByPriority,
    searchItems,
    sortItems,
  };
}
