import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AlertsState, AlertFilters, PaginationState } from '../../types/store';
import { DelayAlert } from '../../types';

// Initial state
const initialState: AlertsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

// Mock data - Phase 1.1 Enhanced with financial context
const mockAlerts: DelayAlert[] = [
  {
    id: '1',
    orderId: '1001',
    customerName: 'John Smith',
    delayDays: 3,
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    customerEmail: 'john@example.com',
    customerPhone: '+1-555-0123',
    trackingNumber: '1Z999AA1234567890',
    carrierCode: 'UPS',
    priority: 'high',
    totalAmount: 384.99,
    currency: 'USD',
    delayReason: 'Weather delay in transit',
    originalEta: '2024-01-17T00:00:00Z',
    revisedEta: '2024-01-20T00:00:00Z',
    notificationStatus: {
      emailSent: true,
      emailSentAt: '2024-01-15T11:00:00Z',
      emailOpened: true,
      emailOpenedAt: '2024-01-15T14:30:00Z',
      emailClicked: true,
      emailClickedAt: '2024-01-15T14:32:00Z',
      smsSent: true,
      smsSentAt: '2024-01-15T11:00:00Z',
    },
    suggestedActions: [
      'Reach out to customer proactively',
      'Offer 15% discount code for inconvenience',
      'Monitor carrier updates',
    ],
    trackingEvents: [
      {
        id: 'evt1',
        timestamp: '2024-01-15T10:00:00Z',
        status: 'exception',
        description: 'Weather delay - severe snow storm',
        location: 'Denver, CO',
        carrierStatus: 'DELAYED',
      },
      {
        id: 'evt2',
        timestamp: '2024-01-14T18:00:00Z',
        status: 'in_transit',
        description: 'Package in transit',
        location: 'Chicago, IL',
        carrierStatus: 'IN_TRANSIT',
      },
    ],
    // Phase 1.2: Line items (product information)
    lineItems: [
      {
        id: 'item-1',
        productId: 'prod-123',
        title: 'Wireless Bluetooth Headphones',
        variantTitle: 'Black / Over-Ear',
        sku: 'WH-BLK-OE',
        quantity: 1,
        price: 299.99,
        productType: 'Electronics',
        vendor: 'AudioTech Pro',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0000/0000/products/headphones-black.jpg',
      },
      {
        id: 'item-2',
        productId: 'prod-456',
        title: 'Premium Phone Case',
        variantTitle: 'Navy Blue',
        sku: 'PC-NAV',
        quantity: 2,
        price: 39.99,
        productType: 'Accessories',
        vendor: 'PhoneGuard',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0000/0000/products/case-blue.jpg',
      },
      {
        id: 'item-3',
        productId: 'prod-789',
        title: 'USB-C Fast Charging Cable (6ft)',
        sku: 'USBC-6FT',
        quantity: 1,
        price: 19.99,
        productType: 'Accessories',
        vendor: 'ChargeMaster',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0000/0000/products/usbc-cable.jpg',
      },
    ],
  },
  {
    id: '2',
    orderId: '1002',
    customerName: 'Sarah Johnson',
    delayDays: 5,
    status: 'resolved',
    createdAt: '2024-01-14T14:20:00Z',
    resolvedAt: '2024-01-16T09:15:00Z',
    customerEmail: 'sarah@example.com',
    customerPhone: '+1-555-0456',
    trackingNumber: '1Z999BB9876543210',
    carrierCode: 'UPS',
    priority: 'medium',
    totalAmount: 129.50,
    currency: 'USD',
    delayReason: 'Carrier sorting facility delay',
    originalEta: '2024-01-16T00:00:00Z',
    revisedEta: '2024-01-18T00:00:00Z',
    notificationStatus: {
      emailSent: true,
      emailSentAt: '2024-01-14T15:00:00Z',
      emailOpened: true,
      emailOpenedAt: '2024-01-14T16:45:00Z',
      smsSent: false,
    },
    suggestedActions: [
      'Send customer updated delivery date',
      'Check carrier for updates',
    ],
  },
  {
    id: '3',
    orderId: '1003',
    customerName: 'Mike Wilson',
    delayDays: 2,
    status: 'active',
    createdAt: '2024-01-16T08:45:00Z',
    customerEmail: 'mike@example.com',
    trackingNumber: '1Z999CC1122334455',
    carrierCode: 'FedEx',
    priority: 'low',
    totalAmount: 49.99,
    currency: 'USD',
    delayReason: 'Package awaiting pickup',
    originalEta: '2024-01-18T00:00:00Z',
    notificationStatus: {
      emailSent: true,
      emailSentAt: '2024-01-16T09:00:00Z',
      emailOpened: false,
      smsSent: false,
    },
    suggestedActions: [
      'Contact warehouse for status',
    ],
  },
];

// Async thunks
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async(_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAlerts;
    } catch (error) {
      return rejectWithValue('Failed to fetch alerts');
    }
  },
);

export const updateAlert = createAsyncThunk(
  'alerts/updateAlert',
  async({ id, updates }: { id: string; updates: Partial<DelayAlert> }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { id, updates };
    } catch (error) {
      return rejectWithValue('Failed to update alert');
    }
  },
);

export const deleteAlert = createAsyncThunk(
  'alerts/deleteAlert',
  async(id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return id;
    } catch (error) {
      return rejectWithValue('Failed to delete alert');
    }
  },
);

// Slice
const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AlertFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch alerts
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = Math.ceil(action.payload.length / state.pagination.limit);
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update alert
      .addCase(updateAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAlert.fulfilled, (state, action) => {
        state.loading = false;
        const { id, updates } = action.payload;
        const index = state.items.findIndex(alert => alert.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      })
      .addCase(updateAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete alert
      .addCase(deleteAlert.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAlert.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(alert => alert.id !== action.payload);
        state.pagination.total = state.items.length;
        state.pagination.totalPages = Math.ceil(state.items.length / state.pagination.limit);
      })
      .addCase(deleteAlert.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setPagination, clearError } = alertsSlice.actions;
export default alertsSlice.reducer;
