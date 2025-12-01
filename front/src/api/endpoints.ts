import client from './client';
import { User, Issue, Property, Repair } from '../types/api';
import { API_BASE_URL } from '@env';
import { storage } from '../utils/storage';

const API_URL = API_BASE_URL || 'http://localhost:5162/api';

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    client.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      email,
      password,
    }),
  register: (data: any) =>
    client.post<{ accessToken: string; user: User }>('/auth/register', data),
};

// Users
export const usersAPI = {
  getProfile: () => client.get<User>('/users/profile'),
  updateProfile: (data: Partial<User>) =>
    client.put<User>('/users/profile', data),
};

// Issues
export const issuesAPI = {
  getAll: (filters?: any) =>
    client.get<Issue[]>('/issues', { params: filters }),
  getById: (id: string) => client.get<Issue>(`/issues/${id}`),
  create: async (data: FormData | Record<string, unknown>) => {
    // Use native fetch for FormData uploads in React Native
    if (data instanceof FormData) {
      console.log('🔵 issuesAPI.create: Detected FormData, using native fetch');
      
      const token = await storage.getItemAsync('authToken');
      
      console.log('🔵 Sending to:', `${API_URL}/issues`);
      console.log('🔵 Has token:', !!token);
      
      const response = await fetch(`${API_URL}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          // Don't set Content-Type - let browser/RN set it with boundary
        },
        body: data,
      });
      
      console.log('🔵 Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('🔴 Error response:', error);
        throw new Error(error || 'Failed to create issue');
      }
      
      const result = await response.json();
      console.log('🟢 Success! Created issue:', result.id);
      return { data: result };
    }
    return client.post<Issue>('/issues', data);
  },
  update: (id: string, data: Partial<Issue>) =>
    client.put<Issue>(`/issues/${id}`, data),
  delete: (id: string) => client.delete(`/issues/${id}`),
};

// Properties
export const propertiesAPI = {
  getAll: () => client.get<Property[]>('/properties'),
  getById: (id: string) => client.get<Property>(`/properties/${id}`),
  create: (data: Partial<Property>) =>
    client.post<Property>('/properties', data),
};

// Repairs
export const repairsAPI = {
  getAll: (filters?: any) =>
    client.get<Repair[]>('/repairs', { params: filters }),
  getById: (id: string) => client.get<Repair>(`/repairs/${id}`),
  updateStatus: (id: string, status: string) =>
    client.put(`/repairs/${id}/status`, { status }),
};
