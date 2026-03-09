/**
 * Data Transfer Objects (DTOs) for Lead entities
 * These represent the exact structure from the server API
 */

/**
 * Lead DTO - Server response format
 */
export interface LeadDTO {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  modified_by: string;
  company_name: string;
  website_url: string | null;
  location: string | null;
  state: string | null;
  city: string | null;
  industry: string;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  decision_maker_phone: string | null;
  linkedin_url: string | null;
  source: string;
  lead_score: number;
  ai_qualification_reason: string | null;
  status: LeadStatusDTO;
  raw_scrape_data: any | null;
  company_phone: string | null;
}

/**
 * Lead status from server
 */
export type LeadStatusDTO = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'ARCHIVED' | 'REJECTED';

/**
 * Pagination metadata from server
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * API Response wrapper for leads
 */
export interface LeadsAPIResponse {
  success: boolean;
  data: {
    leads: LeadDTO[];
    pagination: PaginationDTO;
  };
  message: string;
  timestamp: string;
}

/**
 * API Response wrapper for single lead
 */
export interface LeadAPIResponse {
  success: boolean;
  data: {
    lead: LeadDTO;
  };
  message: string;
  timestamp: string;
}

/**
 * Generic API Error Response
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
