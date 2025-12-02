import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '@env';
import { storage } from '../utils/storage';
import { getStoreDispatch } from '../utils/storeHelpers';
import { logout } from '../store/slices/authSlice';

const API_URL = API_BASE_URL || 'http://localhost:5000/api';

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodaj token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Allow FormData to set its own Content-Type with boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - obsługa błędów
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Jeśli już trwa refresh, dodaj request do kolejki
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItemAsync('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          // Zapisz nowe tokeny
          await storage.setItemAsync('authToken', accessToken);
          await storage.setItemAsync('refreshToken', newRefreshToken);
          
          // Aktualizuj header i przetwórz kolejkę
          client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          
          isRefreshing = false;
          return client(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - wyloguj użytkownika
        processQueue(refreshError, null);
        isRefreshing = false;
        
        await storage.deleteItemAsync('authToken');
        await storage.deleteItemAsync('refreshToken');
        
        // Wyloguj w Redux store
        const dispatch = getStoreDispatch();
        if (dispatch) {
          dispatch(logout());
        }
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
