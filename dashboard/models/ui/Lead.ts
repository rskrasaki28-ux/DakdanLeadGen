/**
 * UI Models for Lead entities
 * These represent the structure used in the frontend components
 */

/**
 * Lead UI Model - Used throughout the application
 */
export interface Lead {
  id: string;
  companyName: string;
  industry: string;
  contactPerson: string;
  email: string;
  status: LeadStatus;
  score: number;
  source: string;
}

/**
 * Lead status for UI display
 */
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Archived' | 'Rejected';

/**
 * Extended Lead Model with additional details
 * Used for detailed views or forms
 */
export interface LeadDetails extends Lead {
  phone?: string;
  websiteUrl?: string;
  location?: string;
  state?: string;
  city?: string;
  linkedinUrl?: string;
  qualificationReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  modifiedBy?: string;
  rawData?: any;
}

/**
 * Pagination metadata for UI
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Leads list response for UI
 */
export interface LeadsResponse {
  leads: Lead[];
  pagination: Pagination;
}
