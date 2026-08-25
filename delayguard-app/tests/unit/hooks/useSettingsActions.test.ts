/**
 * useSettingsActions — save-result handling.
 *
 * Regression (LAUNCH_PLAN §6 R13): `saveSettings` showed
 * "Settings saved successfully!" no matter what the server said.
 *
 * `updateSettings` returns `dispatch(saveSettingsThunk(...))`, and a
 * `createAsyncThunk` that calls `rejectWithValue` **resolves** with a
 * rejected action — it does not throw. So the `catch` never ran and the
 * success toast fired unconditionally. Every SMS toggle on a free plan
 * (403 PLAN_UPGRADE_REQUIRED) reported success while the checkbox
 * silently reverted, and it would have masked R12 too.
 *
 * `testDelayDetection` in the same hook already did this correctly with
 * `.fulfilled.match(result)` — this makes the two consistent.
 */

import { renderHook, act } from '@testing-library/react';
import { useSettingsActions } from '../../../src/hooks/useSettingsActions';
import { AppSettings } from '../../../src/types';

const mockUpdateSettings = jest.fn();
const mockShowSaveSuccessToast = jest.fn();
const mockShowErrorToast = jest.fn();

jest.mock('../../../src/hooks/useSettings', () => ({
  useSettings: () => ({
    updateSettings: mockUpdateSettings,
    resetSettings: jest.fn(),
    validateSettings: () => ({ isValid: true, errors: [] }),
    applyPreset: jest.fn(),
    exportSettings: jest.fn(),
    importSettings: jest.fn(),
  }),
}));

jest.mock('../../../src/hooks/useToasts', () => ({
  useToasts: () => ({
    showSuccessToast: jest.fn(),
    showErrorToast: mockShowErrorToast,
    showWarningToast: jest.fn(),
    showInfoToast: jest.fn(),
    showSaveSuccessToast: mockShowSaveSuccessToast,
    showConnectionSuccessToast: jest.fn(),
    showConnectionErrorToast: jest.fn(),
    showTestSuccessToast: jest.fn(),
    showTestErrorToast: jest.fn(),
  }),
}));

jest.mock('../../../src/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
}));

const settings: AppSettings = {
  delayThreshold: 2,
  notificationTemplate: 'default',
  emailNotifications: true,
  smsNotifications: true,
  autoResolveDays: 7,
  enableAnalytics: true,
  theme: 'light',
  language: 'en',
};

describe('useSettingsActions.saveSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT claim success when the thunk was rejected', async() => {
    // What a rejected createAsyncThunk actually resolves with.
    mockUpdateSettings.mockResolvedValue({
      type: 'settings/saveSettings/rejected',
      payload: 'SMS notifications require the Pro plan or above',
      error: { message: 'Rejected' },
      meta: { rejectedWithValue: true },
    });

    const { result } = renderHook(() => useSettingsActions());

    let outcome: { success: boolean } | undefined;
    await act(async() => {
      outcome = await result.current.saveSettings(settings);
    });

    expect(mockShowSaveSuccessToast).not.toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalled();
    expect(outcome?.success).toBe(false);
  });

  it('surfaces the server reason, so a plan gate is explainable', async() => {
    mockUpdateSettings.mockResolvedValue({
      type: 'settings/saveSettings/rejected',
      payload: 'SMS notifications require the Pro plan or above',
      error: { message: 'Rejected' },
      meta: { rejectedWithValue: true },
    });

    const { result } = renderHook(() => useSettingsActions());

    await act(async() => {
      await result.current.saveSettings(settings);
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      expect.stringContaining('Pro plan'),
    );
  });

  it('still reports success when the thunk fulfils', async() => {
    mockUpdateSettings.mockResolvedValue({
      type: 'settings/saveSettings/fulfilled',
      payload: settings,
      meta: {},
    });

    const { result } = renderHook(() => useSettingsActions());

    let outcome: { success: boolean } | undefined;
    await act(async() => {
      outcome = await result.current.saveSettings(settings);
    });

    expect(mockShowSaveSuccessToast).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
    expect(outcome?.success).toBe(true);
  });
});
