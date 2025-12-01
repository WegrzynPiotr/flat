import client from './client';
import { User, Issue, Property, Repair } from '../types/api';

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
  create: (data: FormData) =>
    client.post<Issue>('/issues', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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
