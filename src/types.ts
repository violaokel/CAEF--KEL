import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
}

export interface MenuItem {
  id: string;
  dayOfWeek: string;
  mainDish: string;
  sideDish?: string;
  dessert?: string;
}

export interface School {
  id: string;
  name: string;
  morningCount: number;
  afternoonCount: number;
  nightCount: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  authorId: string;
}

export interface Schedule {
  arrival: string;
  productionStart: string;
  departure: string;
  specialNote?: string;
}

export interface Birthday {
  id: string;
  name: string;
  day: number;
  month: string;
  role?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
