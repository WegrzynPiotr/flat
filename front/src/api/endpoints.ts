import client from './client';
import { 
  User, 
  Issue, 
  Property, 
  Repair, 
  CommentResponse, 
  MessageResponse, 
  ConversationUser, 
  TenantInfo,
  PropertyResponse,
  IssueResponse,
  UserManagementResponse,
  CreateUserRequest,
  AssignTenantRequest,
  AssignServicemanRequest
} from '../types/api';
import { storage } from '../utils/storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162/api';

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    client.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      email,
      password,
    }),
  register: (data: any) =>
    client.post<{ accessToken: string; user: User }>('/auth/register', data),
  logout: async (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),
  refreshToken: async (refreshToken: string) =>
    client.post<{ accessToken: string; refreshToken: string }>('/auth/refresh-token', { refreshToken }),
  getMe: () => client.get<User>('/auth/me'),
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
    client.get<IssueResponse[]>('/issues', { params: filters }),
  getById: (id: string) => client.get<IssueResponse>(`/issues/${id}`),
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
  updateStatus: (id: string, status: string) =>
    client.put(`/issues/${id}/status`, { status }),
  delete: (id: string) => client.delete(`/issues/${id}`),
};

// Properties
export const propertiesAPI = {
  getAll: () => client.get<PropertyResponse[]>('/properties'),
  getById: (id: string) => client.get<PropertyResponse>(`/properties/${id}`),
  create: (data: Partial<Property>) =>
    client.post<PropertyResponse>('/properties', data),
  update: (id: string, data: Partial<Property>) =>
    client.put<PropertyResponse>(`/properties/${id}`, data),
  uploadPhoto: async (propertyId: string, formData: FormData) => {
    const token = await storage.getItemAsync('authToken');
    
    console.log('🔵 propertiesAPI.uploadPhoto: Uploading to:', `${API_URL}/properties/${propertyId}/photos`);
    
    const response = await fetch(`${API_URL}/properties/${propertyId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    
    console.log('🔵 Upload response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('🔴 Upload error:', error);
      throw new Error(error || 'Failed to upload photo');
    }
    
    const result = await response.json();
    console.log('🟢 Photo uploaded successfully:', result);
    return { data: result };
  },
  deletePhoto: async (propertyId: string, filename: string) => {
    return client.delete(`/properties/${propertyId}/photos/${encodeURIComponent(filename)}`);
  },
  uploadDocument: async (propertyId: string, formData: FormData) => {
    const token = await storage.getItemAsync('authToken');
    
    console.log('🔵 propertiesAPI.uploadDocument: Uploading to:', `${API_URL}/properties/${propertyId}/documents`);
    
    const response = await fetch(`${API_URL}/properties/${propertyId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('🔴 Upload document error:', error);
      throw new Error(error || 'Failed to upload document');
    }
    
    const result = await response.json();
    console.log('🟢 Document uploaded successfully:', result);
    return { data: result };
  },
  deleteDocument: async (propertyId: string, filename: string) => {
    return client.delete(`/properties/${propertyId}/documents/${encodeURIComponent(filename)}`);
  },
  delete: (id: string) => client.delete(`/properties/${id}`),
};

// Comments
export const commentsAPI = {
  create: (issueId: string, content: string) =>
    client.post<CommentResponse>('/comments', { issueId, content }),
  getByIssue: (issueId: string) =>
    client.get<CommentResponse[]>(`/comments/issue/${issueId}`),
};

// Messages
export const messagesAPI = {
  send: (receiverId: string, content: string) =>
    client.post<MessageResponse>('/messages', { receiverId, content }),
  getConversation: (userId: string) =>
    client.get<MessageResponse[]>(`/messages/conversation/${userId}`),
  getContacts: () =>
    client.get<ConversationUser[]>('/messages/contacts'),
  markAsRead: (messageId: string) =>
    client.put(`/messages/${messageId}/mark-read`),
};

// User Management (dla Wynajmujących)
export const userManagementAPI = {
  createUser: (data: CreateUserRequest) =>
    client.post<UserManagementResponse>('/usermanagement/create-user', data),
  assignTenant: (data: AssignTenantRequest) =>
    client.post('/usermanagement/assign-tenant', data),
  assignServiceman: (data: AssignServicemanRequest) =>
    client.post('/usermanagement/assign-serviceman', data),
  getMyTenants: () =>
    client.get<UserManagementResponse[]>('/usermanagement/my-tenants'),
  getMyServicemen: () =>
    client.get<UserManagementResponse[]>('/usermanagement/my-servicemen'),
  removeTenant: (propertyId: string, tenantId: string) =>
    client.delete(`/usermanagement/remove-tenant?propertyId=${propertyId}&tenantId=${tenantId}`),
};

// Repairs
export const repairsAPI = {
  getAll: (filters?: any) =>
    client.get<Repair[]>('/repairs', { params: filters }),
  getById: (id: string) => client.get<Repair>(`/repairs/${id}`),
  updateStatus: (id: string, status: string) =>
    client.put(`/repairs/${id}/status`, { status }),
};
