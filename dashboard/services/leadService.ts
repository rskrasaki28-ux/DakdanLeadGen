import { Lead } from '../models/ui/Lead';
import { LeadsAPIResponse, LeadAPIResponse, APIErrorResponse } from '../models/dto/LeadDTO';
import {
    mapLeadsAPIResponseToUI,
    mapLeadDTOToUI,
    mapUILeadToDTO
} from '../models/mappers/LeadMapper';
import { INITIAL_LEADS } from '../constants';
import { analyzeLeadWithGemini } from './geminiService';

const LEADS_KEY = 'dakdan_leads_db_v1';

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL;
const API_TOKEN = process.env.API_TOKEN;

/**
 * Lead Service - Handles all business logic related to leads
 */
export const leadService = {
    /**
     * Retrieves all leads from the REST API.
     * Falls back to localStorage cache if API fails.
     * Falls back to INITIAL_LEADS as last resort.
     */
    fetchLeads: async (): Promise<Lead[]> => {
        try {
            // Fetch from server
            const response = await fetch(`${API_BASE_URL}/functions/v1/api/v1/leads`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const apiResponse: LeadsAPIResponse = await response.json();

            // Map DTO to UI model
            const { leads } = mapLeadsAPIResponseToUI(apiResponse);

            // Cache in localStorage for offline access
            leadService.cacheLeads(leads);

            return leads;
        } catch (e) {
            console.error("API Error loading leads, falling back to cache", e);

            // Fallback to localStorage cache
            const cached = leadService.getCachedLeads();
            if (cached) {
                return cached;
            }

            // Last resort: return initial leads
            return INITIAL_LEADS;
        }
    },

    /**
     * Creates a new lead and saves it to the server.
     * Falls back to localStorage if API fails.
     */
    createLead: async (lead: Lead): Promise<Lead> => {
        try {
            // Convert UI model to DTO
            const leadDTO = mapUILeadToDTO(lead);

            const response = await fetch(`${API_BASE_URL}/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
                body: JSON.stringify(leadDTO),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const apiResponse: LeadAPIResponse = await response.json();

            // Map DTO back to UI model
            const createdLead = mapLeadDTOToUI(apiResponse.data.lead);

            // Update cache
            const currentLeads = await leadService.fetchLeads();
            leadService.cacheLeads([createdLead, ...currentLeads]);

            return createdLead;
        } catch (e) {
            console.error("API Error creating lead, saving locally", e);

            // Fallback: save to localStorage
            const currentLeads = leadService.getCachedLeads() || [];
            const updatedLeads = [lead, ...currentLeads];
            leadService.cacheLeads(updatedLeads);

            return lead;
        }
    },

    /**
     * Updates an existing lead on the server.
     */
    updateLead: async (leadId: string, updates: Partial<Lead>): Promise<Lead | null> => {
        try {
            // Convert UI updates to DTO format
            const updateDTO = mapUILeadToDTO(updates as Lead);

            const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
                body: JSON.stringify(updateDTO),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const apiResponse: LeadAPIResponse = await response.json();
            const updatedLead = mapLeadDTOToUI(apiResponse.data.lead);

            // Update cache
            const currentLeads = leadService.getCachedLeads() || [];
            const updatedLeads = currentLeads.map(lead =>
                lead.id === leadId ? updatedLead : lead
            );
            leadService.cacheLeads(updatedLeads);

            return updatedLead;
        } catch (e) {
            console.error("API Error updating lead", e);
            return null;
        }
    },

    /**
     * Deletes a lead from the server.
     */
    deleteLead: async (leadId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            // Update cache
            const currentLeads = leadService.getCachedLeads() || [];
            const updatedLeads = currentLeads.filter(lead => lead.id !== leadId);
            leadService.cacheLeads(updatedLeads);

            return true;
        } catch (e) {
            console.error("API Error deleting lead", e);
            return false;
        }
    },

    /**
     * Saves leads to the server (bulk update).
     * Falls back to localStorage if API fails.
     */
    saveLeads: async (leads: Lead[]): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/leads/bulk`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
                body: JSON.stringify({ leads }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            // Update cache
            leadService.cacheLeads(leads);
        } catch (e) {
            console.error("API Error saving leads, caching locally", e);
            leadService.cacheLeads(leads);
        }
    },

    /**
     * Analyzes a lead using AI and returns scoring justification.
     */
    analyzeLead: async (lead: Lead): Promise<string> => {
        const leadData = `Company: ${lead.companyName}, Industry: ${lead.industry}, Contact: ${lead.contactPerson}, Email: ${lead.email}, Score: ${lead.score}, Source: ${lead.source}`;
        return await analyzeLeadWithGemini(leadData);
    },

    /**
     * Enriches a lead with additional data from external sources.
     */
    enrichLead: async (leadId: string): Promise<Lead | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/leads/${leadId}/enrich`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_TOKEN}`,
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const apiResponse: LeadAPIResponse = await response.json();
            const enrichedLead = mapLeadDTOToUI(apiResponse.data.lead);

            // Update cache
            const currentLeads = leadService.getCachedLeads() || [];
            const updatedLeads = currentLeads.map(lead =>
                lead.id === leadId ? enrichedLead : lead
            );
            leadService.cacheLeads(updatedLeads);

            return enrichedLead;
        } catch (e) {
            console.error("API Error enriching lead", e);
            return null;
        }
    },

    /**
     * Filters leads by various criteria.
     */
    filterLeads: (leads: Lead[], filters: {
        industry?: string;
        minScore?: number;
        maxScore?: number;
        source?: string;
        searchTerm?: string;
    }): Lead[] => {
        return leads.filter(lead => {
            if (filters.industry && lead.industry !== filters.industry) return false;
            if (filters.minScore && lead.score < filters.minScore) return false;
            if (filters.maxScore && lead.score > filters.maxScore) return false;
            if (filters.source && lead.source !== filters.source) return false;
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                const searchableText = `${lead.companyName} ${lead.contactPerson} ${lead.email} ${lead.industry}`.toLowerCase();
                if (!searchableText.includes(term)) return false;
            }
            return true;
        });
    },

    /**
     * Sorts leads by various criteria.
     */
    sortLeads: (leads: Lead[], sortBy: 'score' | 'companyName' | 'industry' | 'source', order: 'asc' | 'desc' = 'desc'): Lead[] => {
        const sorted = [...leads].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'score':
                    comparison = a.score - b.score;
                    break;
                case 'companyName':
                    comparison = a.companyName.localeCompare(b.companyName);
                    break;
                case 'industry':
                    comparison = a.industry.localeCompare(b.industry);
                    break;
                case 'source':
                    comparison = a.source.localeCompare(b.source);
                    break;
            }

            return order === 'asc' ? comparison : -comparison;
        });

        return sorted;
    },

    /**
     * Gets statistics about leads.
     */
    getLeadStats: (leads: Lead[]): {
        total: number;
        highScore: number;
        mediumScore: number;
        lowScore: number;
        averageScore: number;
        byIndustry: Record<string, number>;
        bySource: Record<string, number>;
    } => {
        const stats = {
            total: leads.length,
            highScore: leads.filter(l => l.score >= 80).length,
            mediumScore: leads.filter(l => l.score >= 50 && l.score < 80).length,
            lowScore: leads.filter(l => l.score < 50).length,
            averageScore: leads.reduce((sum, l) => sum + l.score, 0) / leads.length || 0,
            byIndustry: {} as Record<string, number>,
            bySource: {} as Record<string, number>,
        };

        leads.forEach(lead => {
            stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
            stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
        });

        return stats;
    },

    // --- Cache Management (Private Helpers) ---

    /**
     * Caches leads in localStorage.
     */
    cacheLeads: (leads: Lead[]): void => {
        try {
            localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
        } catch (e) {
            console.error("Error caching leads", e);
        }
    },

    /**
     * Gets cached leads from localStorage.
     */
    getCachedLeads: (): Lead[] | null => {
        try {
            const cached = localStorage.getItem(LEADS_KEY);
            if (!cached) return null;
            return JSON.parse(cached);
        } catch (e) {
            console.error("Error getting cached leads", e);
            return null;
        }
    },

    /**
     * Clears the lead cache.
     */
    clearCache: (): void => {
        try {
            localStorage.removeItem(LEADS_KEY);
        } catch (e) {
            console.error("Error clearing lead cache", e);
        }
    },
};
