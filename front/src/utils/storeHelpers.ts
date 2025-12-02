import { AppDispatch } from '../store/store';

// Singleton do przechowania referencji do dispatch
let storeDispatch: AppDispatch | null = null;

export const setStoreDispatch = (dispatch: AppDispatch) => {
  storeDispatch = dispatch;
};

export const getStoreDispatch = (): AppDispatch | null => {
  return storeDispatch;
};
