import { useCallback } from 'react';
import { useAsyncResource, useItemFilters } from './useAsyncResource';
import { fetchOrders, updateOrder, deleteOrder } from '../store/slices/ordersSlice';
import { Order } from '../types';

export const useOrders = () => {
  // Use the generic useAsyncResource hook
  const {
    items: orders,
    loading,
    error,
    createItem: createNewOrder,
    updateItem: updateExistingOrder,
    deleteItem: deleteExistingOrder,
    refreshItems: refreshOrders,
  } = useAsyncResource<Order>(
    'orders',
    fetchOrders,
    updateOrder,
    deleteOrder,
    (state) => ({
      items: state.orders.items,
      loading: state.orders.loading,
      error: state.orders.error,
    }),
  );

  // Use the generic filtering and sorting hook
  const {
    getItemsByStatus: getOrdersByStatus,
    searchItems: searchOrdersGeneric,
    sortItems: sortOrdersGeneric,
  } = useItemFilters<Order>(
    orders,
    (order) => order.status,
  );

  const getProcessingOrders = useCallback(() => {
    return getOrdersByStatus('processing');
  }, [getOrdersByStatus]);

  const getShippedOrders = useCallback(() => {
    return getOrdersByStatus('shipped');
  }, [getOrdersByStatus]);

  const getDeliveredOrders = useCallback(() => {
    return getOrdersByStatus('delivered');
  }, [getOrdersByStatus]);

  const getOrdersByDateRange = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders]);

  const getOrdersByCustomer = useCallback((customerName: string) => {
    return orders.filter(order => 
      order.customerName.toLowerCase().includes(customerName.toLowerCase()),
    );
  }, [orders]);

  const getOrdersWithTracking = useCallback(() => {
    return orders.filter(order => order.trackingNumber);
  }, [orders]);

  const getOrdersWithoutTracking = useCallback(() => {
    return orders.filter(order => !order.trackingNumber);
  }, [orders]);

  // Search functionality using generic search
  const searchOrders = useCallback((query: string) => {
    return searchOrdersGeneric(query, ['orderNumber', 'customerName', 'trackingNumber', 'status']);
  }, [searchOrdersGeneric]);

  // Statistics
  const getOrderStats = useCallback(() => {
    const total = orders.length;
    const processing = getProcessingOrders().length;
    const shipped = getShippedOrders().length;
    const delivered = getDeliveredOrders().length;
    const withTracking = getOrdersWithTracking().length;
    const withoutTracking = getOrdersWithoutTracking().length;
    
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const avgOrderValue = total > 0 ? totalRevenue / total : 0;

    return {
      total,
      processing,
      shipped,
      delivered,
      withTracking,
      withoutTracking,
      totalRevenue,
      avgOrderValue: avgOrderValue.toFixed(2),
    };
  }, [orders, getProcessingOrders, getShippedOrders, getDeliveredOrders, getOrdersWithTracking, getOrdersWithoutTracking]);

  return {
    // Data
    orders,
    loading,
    error,
    
    // Actions
    createOrder: createNewOrder,
    updateOrder: updateExistingOrder,
    deleteOrder: deleteExistingOrder,
    refreshOrders,
    
    // Filtering
    getOrdersByStatus,
    getProcessingOrders,
    getShippedOrders,
    getDeliveredOrders,
    getOrdersByDateRange,
    getOrdersByCustomer,
    getOrdersWithTracking,
    getOrdersWithoutTracking,
    
    // Search
    searchOrders,
    
    // Statistics
    getOrderStats,
  };
};
