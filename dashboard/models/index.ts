/**
 * Central export point for all models
 */

// DTO exports
export type {
  LeadDTO,
  LeadStatusDTO,
  PaginationDTO,
  LeadsAPIResponse,
  LeadAPIResponse,
  APIErrorResponse,
} from './dto/LeadDTO';

// UI Model exports
export type {
  Lead,
  LeadStatus,
  LeadDetails,
  Pagination,
  LeadsResponse,
} from './ui/Lead';

// Mapper exports
export {
  mapLeadDTOToUI,
  mapLeadDTOToDetailedUI,
  mapUILeadToDTO,
  mapPaginationToUI,
  mapLeadsAPIResponseToUI,
  mapLeadStatusToUI,
  mapLeadStatusToDTO,
  mapLeadDTOsToUI,
  mapLeadDTOsToDetailedUI,
} from './mappers/LeadMapper';
