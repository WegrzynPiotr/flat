import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '@env';
import { storage } from '../utils/storage';

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

// Response interceptor - obsługa błędów
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - spróbuj refresh
      try {
        const refreshToken = await storage.getItemAsync('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });
          const { accessToken } = response.data;
          await storage.setItemAsync('authToken', accessToken);
          
          // Ponów oryginalny request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return client(error.config);
          }
        }
      } catch (refreshError) {
        // Refresh failed - wyloguj
        await storage.deleteItemAsync('authToken');
        await storage.deleteItemAsync('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

export default client;
