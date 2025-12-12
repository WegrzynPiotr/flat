export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles?: string[]; // Lista wszystkich ról użytkownika
  phoneNumber?: string;
  createdAt?: string;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate?: string;
}

export interface OwnerInfo {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
}

export interface PropertyDocumentInfo {
  filename: string;
  originalName: string;
  uploadedAt: string;
  url: string;
}

// Nowy system wersjonowania dokumentów
export interface PropertyDocument {
  id: string;
  propertyId: string;
  documentType: string; // Umowa, Wodomierz, Prąd, Gaz, Ogrzewanie, Ubezpieczenie, Remont, Inne
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
  notes: string;
  version: number;
}

export interface PropertyDocumentVersion {
  id: string;
  version: number;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
  notes: string;
  isLatest: boolean;
}

export interface Property {
  id: string;
  name?: string;
  address: string;
  description?: string;
  city?: string;
  postalCode?: string;
  ownerId?: string;
  owner?: OwnerInfo;
  photos?: string[];
  documents?: PropertyDocumentInfo[];
  tenants?: TenantInfo[];
  roomsCount?: number;
  area?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  isActiveTenant?: boolean;
}

export interface ServicemanInfo {
  servicemanId: string;
  servicemanName: string;
  assignedAt: string;
}

export interface PhotoInfo {
  id: string;
  url: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
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
  statusChanged?: boolean;
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

export interface UserRelation {
  role: string;
  details?: string; // Adres mieszkania lub nazwa usterki dla serwisanta
}

export interface ConversationUser {
  userId: string;
  name: string;
  unreadCount: number;
  relations: UserRelation[];
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
  ownerId?: string;
  roomsCount?: number;
  area?: number;
  photos?: string[];
  documents?: PropertyDocumentInfo[];
  tenants: TenantInfo[];
  createdAt?: string;
  isActiveTenant?: boolean;
  latitude?: number;
  longitude?: number;
  owner?: OwnerInfo;
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
  property?: {
    id: string;
    address: string;
    ownerId: string;
    latitude?: number;
    longitude?: number;
  };
  reportedById: string;
  reportedByName?: string;
  assignedServicemen?: ServicemanInfo[];
  comments?: CommentResponse[];
  reportedAt: string;
  resolvedAt?: string;
  photos?: string[]; // Legacy
  photosWithMetadata?: PhotoInfo[];
}

export interface UserManagementResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  properties: string[]; // Adresy nieruchomości
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
  endDate?: string | null;
}

export interface AssignServicemanRequest {
  issueId: string;
  servicemanId: string;
}

export interface InvitationResponse {
  id: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeId: string;
  inviteeName: string;
  inviteeEmail: string;
  invitationType: 'Najemca' | 'Serwisant';
  status: 'Pending' | 'Accepted' | 'Rejected';
  message?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface UserNoteResponse {
  id?: string;
  targetUserId: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Service Requests (zaproszenia serwisantów do usterek)
export interface ServiceRequestResponse {
  id: string;
  issueId: string;
  issueTitle: string;
  issueDescription: string;
  issueCategory: string;
  issuePriority: string;
  issueStatus: string;
  issuePhoto?: string;  // Pierwsze zdjęcie usterki
  propertyAddress: string;
  propertyCity: string;
  landlordId: string;
  landlordName: string;
  message?: string;
  responseMessage?: string;
  createdAt: string;
  respondedAt?: string;
  status: 'Oczekujące' | 'Zaakceptowane' | 'Odrzucone' | 'Anulowane' | 'Wygasłe' | 'Zrezygnowano';
}

// Historia serwisantów dla usterki
export interface ServiceRequestHistoryItem {
  id: string;
  servicemanId: string;
  servicemanName: string;
  servicemanFirstName: string;
  servicemanLastName: string;
  status: 'Oczekujące' | 'Zaakceptowane' | 'Odrzucone' | 'Anulowane' | 'Wygasłe' | 'Zrezygnowano';
  message?: string;
  responseMessage?: string;
  createdAt: string;
  respondedAt?: string;
}
