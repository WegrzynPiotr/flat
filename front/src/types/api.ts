export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate?: string;
}

export interface Property {
  id: string;
  name?: string;
  address: string;
  description?: string;
  city?: string;
  postalCode?: string;
  ownerId?: string;
  photos?: string[];
  tenants?: TenantInfo[];
  roomsCount?: number;
  area?: number;
  createdAt?: string;
}

export interface ServicemanInfo {
  servicemanId: string;
  servicemanName: string;
  assignedAt: string;
}

export interface CommentResponse {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  location?: string;
  category?: string;
  priority: string;
  status: string;
  propertyId: string;
  propertyAddress?: string;
  reportedById: string;
  reportedByName?: string;
  assignedServicemen?: ServicemanInfo[];
  comments?: CommentResponse[];
  createdAt?: string;
  reportedAt: string;
  resolvedAt?: string;
  photos?: string[];
}

export interface MessageResponse {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface ConversationUser {
  userId: string;
  name: string;
  role: string;
  unreadCount: number;
  propertyAddress?: string;
}

export interface Repair {
  id: string;
  issueId: string;
  assignedToId?: string;
  scheduledDate?: string;
  completedDate?: string;
  status: 'Zaplanowana' | 'WTrakcie' | 'Zakończona' | 'Anulowana';
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
}

export interface PropertyResponse {
  id: string;
  address: string;
  description?: string;
  city?: string;
  postalCode?: string;
  roomsCount?: number;
  area?: number;
  photos?: string[];
  tenants: TenantInfo[];
  createdAt?: string;
}

export interface IssueResponse {
  id: string;
  title: string;
  description: string;
  location?: string;
  category?: string;
  priority: string;
  status: string;
  propertyId: string;
  propertyAddress?: string;
  reportedById: string;
  reportedByName?: string;
  assignedServicemen?: ServicemanInfo[];
  comments?: CommentResponse[];
  reportedAt: string;
  resolvedAt?: string;
  photos?: string[];
}

export interface UserManagementResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'Najemca' | 'Serwisant';
}

export interface AssignTenantRequest {
  propertyId: string;
  tenantId: string;
  startDate: string;
}

export interface AssignServicemanRequest {
  issueId: string;
  servicemanId: string;
}
