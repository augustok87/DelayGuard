import appReducer, { 
  setShop, 
  setLoading, 
  clearError 
} from '../appSlice';
import { AppState } from '../../../types/store';

describe('appSlice', () => {
  const initialState: AppState = {
    shop: null,
    loading: false,
    error: null,
    initialized: false,
  };

  it('should return the initial state', () => {
    expect(appReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setShop', () => {
    const shop = 'test-shop.myshopify.com';
    const actual = appReducer(initialState, setShop(shop));
    expect(actual.shop).toBe(shop);
  });

  it('should handle setLoading', () => {
    const actual = appReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = appReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle multiple state changes', () => {
    let actual = appReducer(initialState, setShop('test-shop.myshopify.com'));
    actual = appReducer(actual, setLoading(true));
    
    expect(actual.shop).toBe('test-shop.myshopify.com');
    expect(actual.loading).toBe(true);
    expect(actual.error).toBeNull();
  });

  it('should preserve other state when updating single field', () => {
    const stateWithShop = { ...initialState, shop: 'existing-shop.myshopify.com' };
    const actual = appReducer(stateWithShop, setLoading(true));
    
    expect(actual.shop).toBe('existing-shop.myshopify.com');
    expect(actual.loading).toBe(true);
  });

  it('should handle null values correctly', () => {
    const stateWithValues = {
      shop: 'test-shop.myshopify.com',
      loading: true,
      error: 'Some error',
      initialized: true,
    };
    
    let actual = appReducer(stateWithValues, setShop(null));
    expect(actual.shop).toBeNull();
    
    actual = appReducer(actual, setError(null));
    expect(actual.error).toBeNull();
  });

  it('should handle empty string values', () => {
    const actual = appReducer(initialState, setShop(''));
    expect(actual.shop).toBe('');
  });

  it('should handle boolean state changes', () => {
    let actual = appReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
    
    actual = appReducer(actual, setLoading(false));
    expect(actual.loading).toBe(false);
    
    actual = appReducer(actual, setInitialized(true));
    expect(actual.initialized).toBe(true);
  });
});
