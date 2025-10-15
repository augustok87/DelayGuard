import { renderHook, act } from '@testing-library/react';
import { useAlertActions } from '../../../src/hooks/useAlertActions';

// Mock the dependencies
jest.mock('../../../src/hooks/useDelayAlerts', () => ({
  useDelayAlerts: jest.fn(),
}));

jest.mock('../../../src/hooks/useToasts', () => ({
  useToasts: jest.fn(),
}));

describe('useAlertActions', () => {
  const mockUpdateAlert = jest.fn();
  const mockDeleteAlert = jest.fn();
  const mockShowSuccessToast = jest.fn();
  const mockShowErrorToast = jest.fn();
  const mockShowDeleteSuccessToast = jest.fn();
  const mockShowDeleteErrorToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useDelayAlerts
    require('../../../src/hooks/useDelayAlerts').useDelayAlerts.mockReturnValue({
      updateAlert: mockUpdateAlert,
      deleteAlert: mockDeleteAlert,
    });

    // Mock useToasts
    require('../../../src/hooks/useToasts').useToasts.mockReturnValue({
      showSuccessToast: mockShowSuccessToast,
      showErrorToast: mockShowErrorToast,
      showDeleteSuccessToast: mockShowDeleteSuccessToast,
      showDeleteErrorToast: mockShowDeleteErrorToast,
    });
  });

  it('should resolve alert successfully', async() => {
    mockUpdateAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { resolveAlert } = result.current;

    let resolveResult;
    await act(async() => {
      resolveResult = await resolveAlert('alert-1');
    });

    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'resolved',
      resolvedAt: expect.any(String),
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Alert resolved successfully!');
    expect(resolveResult).toEqual({ success: true });
  });

  it('should handle resolve alert failure', async() => {
    mockUpdateAlert.mockResolvedValue({ 
      success: false, 
      error: 'Database connection failed', 
    });

    const { result } = renderHook(() => useAlertActions());
    const { resolveAlert } = result.current;

    let resolveResult;
    await act(async() => {
      resolveResult = await resolveAlert('alert-1');
    });

    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'resolved',
      resolvedAt: expect.any(String),
    });
    expect(mockShowErrorToast).toHaveBeenCalledWith('Database connection failed');
    expect(resolveResult).toEqual({ 
      success: false, 
      error: 'Database connection failed', 
    });
  });

  it('should handle resolve alert exception', async() => {
    mockUpdateAlert.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAlertActions());
    const { resolveAlert } = result.current;

    let resolveResult;
    await act(async() => {
      resolveResult = await resolveAlert('alert-1');
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('An unexpected error occurred');
    expect(resolveResult).toEqual({ 
      success: false, 
      error: 'An unexpected error occurred', 
    });
  });

  it('should dismiss alert successfully', async() => {
    mockUpdateAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { dismissAlert } = result.current;

    let dismissResult;
    await act(async() => {
      dismissResult = await dismissAlert('alert-1');
    });

    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'dismissed',
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Alert dismissed successfully!');
    expect(dismissResult).toEqual({ success: true });
  });

  it('should handle dismiss alert failure', async() => {
    mockUpdateAlert.mockResolvedValue({ 
      success: false, 
      error: 'Permission denied', 
    });

    const { result } = renderHook(() => useAlertActions());
    const { dismissAlert } = result.current;

    let dismissResult;
    await act(async() => {
      dismissResult = await dismissAlert('alert-1');
    });

    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'dismissed',
    });
    expect(mockShowErrorToast).toHaveBeenCalledWith('Permission denied');
    expect(dismissResult).toEqual({ 
      success: false, 
      error: 'Permission denied', 
    });
  });

  it('should handle dismiss alert exception', async() => {
    mockUpdateAlert.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useAlertActions());
    const { dismissAlert } = result.current;

    let dismissResult;
    await act(async() => {
      dismissResult = await dismissAlert('alert-1');
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('An unexpected error occurred');
    expect(dismissResult).toEqual({ 
      success: false, 
      error: 'An unexpected error occurred', 
    });
  });

  it('should delete alert permanently successfully', async() => {
    mockDeleteAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { deleteAlert } = result.current;

    let deleteResult;
    await act(async() => {
      deleteResult = await deleteAlert('alert-1');
    });

    expect(mockDeleteAlert).toHaveBeenCalledWith('alert-1');
    expect(mockShowDeleteSuccessToast).toHaveBeenCalledWith('Alert deleted permanently!');
    expect(deleteResult).toEqual({ success: true });
  });

  it('should handle delete alert failure', async() => {
    mockDeleteAlert.mockResolvedValue({ 
      success: false, 
      error: 'Cannot delete active alert', 
    });

    const { result } = renderHook(() => useAlertActions());
    const { deleteAlert } = result.current;

    let deleteResult;
    await act(async() => {
      deleteResult = await deleteAlert('alert-1');
    });

    expect(mockDeleteAlert).toHaveBeenCalledWith('alert-1');
    expect(mockShowDeleteErrorToast).toHaveBeenCalledWith('Cannot delete active alert');
    expect(deleteResult).toEqual({ 
      success: false, 
      error: 'Cannot delete active alert', 
    });
  });

  it('should handle delete alert exception', async() => {
    mockDeleteAlert.mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useAlertActions());
    const { deleteAlert } = result.current;

    let deleteResult;
    await act(async() => {
      deleteResult = await deleteAlert('alert-1');
    });

    expect(mockShowDeleteErrorToast).toHaveBeenCalledWith('An unexpected error occurred');
    expect(deleteResult).toEqual({ 
      success: false, 
      error: 'An unexpected error occurred', 
    });
  });

  it('should bulk resolve alerts successfully', async() => {
    mockUpdateAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { bulkResolveAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkResolveAlerts(['alert-1', 'alert-2']);
    });

    expect(mockUpdateAlert).toHaveBeenCalledTimes(2);
    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'resolved',
      resolvedAt: expect.any(String),
    });
    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-2', {
      status: 'resolved',
      resolvedAt: expect.any(String),
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('2 alerts resolved successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      resolvedCount: 2,
      totalCount: 2,
    });
  });

  it('should handle bulk resolve alerts with partial failures', async() => {
    mockUpdateAlert
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Permission denied' });

    const { result } = renderHook(() => useAlertActions());
    const { bulkResolveAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkResolveAlerts(['alert-1', 'alert-2']);
    });

    expect(mockUpdateAlert).toHaveBeenCalledTimes(2);
    expect(mockShowSuccessToast).toHaveBeenCalledWith('1 alerts resolved successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      resolvedCount: 1,
      totalCount: 2,
    });
  });

  it('should bulk dismiss alerts successfully', async() => {
    mockUpdateAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { bulkDismissAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkDismissAlerts(['alert-1', 'alert-2']);
    });

    expect(mockUpdateAlert).toHaveBeenCalledTimes(2);
    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
      status: 'dismissed',
    });
    expect(mockUpdateAlert).toHaveBeenCalledWith('alert-2', {
      status: 'dismissed',
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('2 alerts dismissed successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      dismissedCount: 2,
      totalCount: 2,
    });
  });

  it('should handle bulk dismiss alerts with partial failures', async() => {
    mockUpdateAlert
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Network timeout' });

    const { result } = renderHook(() => useAlertActions());
    const { bulkDismissAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkDismissAlerts(['alert-1', 'alert-2']);
    });

    expect(mockUpdateAlert).toHaveBeenCalledTimes(2);
    expect(mockShowSuccessToast).toHaveBeenCalledWith('1 alerts dismissed successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      dismissedCount: 1,
      totalCount: 2,
    });
  });

  it('should bulk delete alerts successfully', async() => {
    mockDeleteAlert.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAlertActions());
    const { bulkDeleteAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkDeleteAlerts(['alert-1', 'alert-2']);
    });

    expect(mockDeleteAlert).toHaveBeenCalledTimes(2);
    expect(mockDeleteAlert).toHaveBeenCalledWith('alert-1');
    expect(mockDeleteAlert).toHaveBeenCalledWith('alert-2');
    expect(mockShowDeleteSuccessToast).toHaveBeenCalledWith('2 alerts deleted successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      deletedCount: 2,
      totalCount: 2,
    });
  });

  it('should handle bulk delete alerts with partial failures', async() => {
    mockDeleteAlert
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Cannot delete active alert' });

    const { result } = renderHook(() => useAlertActions());
    const { bulkDeleteAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkDeleteAlerts(['alert-1', 'alert-2']);
    });

    expect(mockDeleteAlert).toHaveBeenCalledTimes(2);
    expect(mockShowDeleteSuccessToast).toHaveBeenCalledWith('1 alerts deleted successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      deletedCount: 1,
      totalCount: 2,
    });
  });

  it('should handle empty bulk operations', async() => {
    const { result } = renderHook(() => useAlertActions());
    const { bulkResolveAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkResolveAlerts([]);
    });

    expect(mockUpdateAlert).not.toHaveBeenCalled();
    expect(mockShowSuccessToast).toHaveBeenCalledWith('0 alerts resolved successfully!');
    expect(bulkResult).toEqual({ 
      success: true, 
      resolvedCount: 0,
      totalCount: 0,
    });
  });

  it('should handle bulk operations with exceptions', async() => {
    mockUpdateAlert.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAlertActions());
    const { bulkResolveAlerts } = result.current;

    let bulkResult;
    await act(async() => {
      bulkResult = await bulkResolveAlerts(['alert-1']);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith('1 alerts failed to resolve');
    expect(bulkResult).toEqual({ 
      success: false, 
      resolvedCount: 0,
      totalCount: 1,
    });
  });

  it('should memoize callback functions', () => {
    const { result, rerender } = renderHook(() => useAlertActions());
    
    const firstRender = result.current;
    rerender();
    const secondRender = result.current;

    expect(firstRender.resolveAlert).toBe(secondRender.resolveAlert);
    expect(firstRender.dismissAlert).toBe(secondRender.dismissAlert);
    expect(firstRender.deleteAlert).toBe(secondRender.deleteAlert);
    expect(firstRender.bulkResolveAlerts).toBe(secondRender.bulkResolveAlerts);
    expect(firstRender.bulkDismissAlerts).toBe(secondRender.bulkDismissAlerts);
    expect(firstRender.bulkDeleteAlerts).toBe(secondRender.bulkDeleteAlerts);
  });
});
