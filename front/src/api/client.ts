import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';
import { getStoreDispatch } from '../utils/storeHelpers';
import { logout } from '../store/slices/authSlice';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162/api';

console.log('🌐 API URL configured:', API_URL);

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Zwiększam timeout do 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodaj token
client.interceptors.request.use(
  async (config) => {
    console.log('📤 REQUEST:', config.method?.toUpperCase(), config.url);
    console.log('   Base URL:', config.baseURL);
    console.log('   Full URL:', `${config.baseURL}${config.url}`);
    
    try {
      const token = await storage.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token attached');
      } else {
        console.log('⚠️  No token in storage');
      }
      
      // Allow FormData to set its own Content-Type with boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
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
  (response) => {
    console.log('✅ RESPONSE:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    console.error('❌ RESPONSE ERROR:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
      code: error.code,
    });
    
    // Sprawdź czy to błąd sieciowy
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️  Request timeout - server not responding');
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('🌐 Network error - cannot reach server at:', API_URL);
    }
    
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
