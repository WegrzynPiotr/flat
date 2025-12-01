export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string;
  createdAt?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  city?: string;
  postalCode?: string;
  ownerId?: string;
  currentTenantId?: string;
  roomsCount?: number;
  area?: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  location: string;
  category?: 'Hydraulika' | 'Elektryka' | 'Ogrzewanie' | 'OknaIDrzwi' | 'AGD' | 'Inne';
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'in_progress' | 'resolved';
  propertyId?: string;
  reportedById?: string;
  assignedTo?: string;
  createdAt: string;
  reportedAt?: string;
  resolvedAt?: string;
  photos?: string[];
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
