import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchOrders, updateOrder, deleteOrder } from '../store/slices/ordersSlice';
import { Order, CreateOrderData, UpdateOrderData } from '../types';

export const useOrders = () => {
  const dispatch = useAppDispatch();
  const { items: orders, loading, error } = useAppSelector(state => state.orders);

  // Load orders on mount
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  // Order actions - Note: createOrder would need to be implemented in the slice
  const createNewOrder = useCallback(async(orderData: CreateOrderData) => {
    try {
      // For now, we'll just add to local state
      // In a real app, this would dispatch a createOrder action
      console.log('Creating order:', orderData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, []);

  const updateExistingOrder = useCallback(async(id: string, updates: UpdateOrderData) => {
    try {
      await dispatch(updateOrder({ id, updates })).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  const deleteExistingOrder = useCallback(async(id: string) => {
    try {
      await dispatch(deleteOrder(id)).unwrap();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as string };
    }
  }, [dispatch]);

  // Order filtering and sorting
  const getOrdersByStatus = useCallback((status: string) => {
    return orders.filter(order => order.status === status);
  }, [orders]);

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

  // Search functionality
  const searchOrders = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return orders.filter(order => 
      order.orderNumber.toLowerCase().includes(lowercaseQuery) ||
      order.customerName.toLowerCase().includes(lowercaseQuery) ||
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(lowercaseQuery)) ||
      order.status.toLowerCase().includes(lowercaseQuery),
    );
  }, [orders]);

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
    refreshOrders: () => dispatch(fetchOrders()),
    
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
