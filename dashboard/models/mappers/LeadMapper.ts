/**
 * Mappers to convert between DTO and UI models
 */

import { LeadDTO, LeadStatusDTO, PaginationDTO, LeadsAPIResponse } from '../dto/LeadDTO';
import { Lead, LeadStatus, LeadDetails, Pagination, LeadsResponse } from '../ui/Lead';

/**
 * Maps server lead status to UI status
 */
export const mapLeadStatusToUI = (status: LeadStatusDTO): LeadStatus => {
  const statusMap: Record<LeadStatusDTO, LeadStatus> = {
    'NEW': 'New',
    'CONTACTED': 'Contacted',
    'QUALIFIED': 'Qualified',
    'CONVERTED': 'Converted',
    'ARCHIVED': 'Archived',
    'REJECTED': 'Rejected',
  };
  return statusMap[status] || 'New';
};

/**
 * Maps UI lead status to server status
 */
export const mapLeadStatusToDTO = (status: LeadStatus): LeadStatusDTO => {
  const statusMap: Record<LeadStatus, LeadStatusDTO> = {
    'New': 'NEW',
    'Contacted': 'CONTACTED',
    'Qualified': 'QUALIFIED',
    'Converted': 'CONVERTED',
    'Archived': 'ARCHIVED',
    'Rejected': 'REJECTED',
  };
  return statusMap[status] || 'NEW';
};

/**
 * Maps LeadDTO from server to UI Lead model
 */
export const mapLeadDTOToUI = (dto: LeadDTO): Lead => {
  return {
    id: dto.id,
    companyName: dto.company_name,
    industry: dto.industry,
    contactPerson: dto.decision_maker_name || 'Unknown',
    email: dto.decision_maker_email || 'no-email@unknown.com',
    status: mapLeadStatusToUI(dto.status),
    score: dto.lead_score,
    source: formatSource(dto.source),
  };
};

/**
 * Maps LeadDTO to detailed UI Lead model
 */
export const mapLeadDTOToDetailedUI = (dto: LeadDTO): LeadDetails => {
  return {
    id: dto.id,
    companyName: dto.company_name,
    industry: dto.industry,
    contactPerson: dto.decision_maker_name || 'Unknown',
    email: dto.decision_maker_email || 'no-email@unknown.com',
    status: mapLeadStatusToUI(dto.status),
    score: dto.lead_score,
    source: formatSource(dto.source),
    phone: dto.decision_maker_phone || dto.company_phone || undefined,
    websiteUrl: dto.website_url || undefined,
    location: dto.location || undefined,
    state: dto.state || undefined,
    city: dto.city || undefined,
    linkedinUrl: dto.linkedin_url || undefined,
    qualificationReason: dto.ai_qualification_reason || undefined,
    createdAt: dto.created_at ? new Date(dto.created_at) : undefined,
    updatedAt: dto.updated_at ? new Date(dto.updated_at) : undefined,
    createdBy: dto.created_by,
    modifiedBy: dto.modified_by,
    rawData: dto.raw_scrape_data || undefined,
  };
};

/**
 * Maps UI Lead to partial DTO for updates
 */
export const mapUILeadToDTO = (lead: Lead): Partial<LeadDTO> => {
  return {
    company_name: lead.companyName,
    industry: lead.industry,
    decision_maker_name: lead.contactPerson,
    decision_maker_email: lead.email,
    status: mapLeadStatusToDTO(lead.status),
    lead_score: lead.score,
    source: lead.source.toLowerCase().replace(/\s+/g, '_'),
  };
};

/**
 * Maps pagination from DTO to UI
 */
export const mapPaginationToUI = (dto: PaginationDTO): Pagination => {
  return {
    page: dto.page,
    limit: dto.limit,
    total: dto.total,
    totalPages: dto.totalPages,
  };
};

/**
 * Maps complete API response to UI LeadsResponse
 */
export const mapLeadsAPIResponseToUI = (apiResponse: LeadsAPIResponse): LeadsResponse => {
  return {
    leads: apiResponse.data.leads.map(mapLeadDTOToUI),
    pagination: mapPaginationToUI(apiResponse.data.pagination),
  };
};

/**
 * Formats source string for display
 */
const formatSource = (source: string): string => {
  // Convert snake_case or lowercase to display format
  // e.g., "calculator" -> "Calculator", "stan_scraping" -> "Stan (Scraping)"
  
  const sourceMap: Record<string, string> = {
    'calculator': 'Calculator',
    'linkedin': 'LinkedIn',
    'inbound': 'Inbound',
    'scraping': 'Stan (Scraping)',
    'stan_scraping': 'Stan (Scraping)',
    'email': 'Sonny (Email)',
    'sonny_email': 'Sonny (Email)',
  };

  const lowerSource = source.toLowerCase();
  
  if (sourceMap[lowerSource]) {
    return sourceMap[lowerSource];
  }

  // Default: capitalize first letter
  return source.charAt(0).toUpperCase() + source.slice(1);
};

/**
 * Batch map multiple lead DTOs to UI models
 */
export const mapLeadDTOsToUI = (dtos: LeadDTO[]): Lead[] => {
  return dtos.map(mapLeadDTOToUI);
};

/**
 * Batch map multiple lead DTOs to detailed UI models
 */
export const mapLeadDTOsToDetailedUI = (dtos: LeadDTO[]): LeadDetails[] => {
  return dtos.map(mapLeadDTOToDetailedUI);
};
