# Models Architecture

This folder contains all data models following the **DTO (Data Transfer Object) pattern** for clean separation between server responses and UI representations.

## Folder Structure

```
models/
├── dto/          # Data Transfer Objects (Server format)
├── ui/           # UI Models (Application format)
├── mappers/      # Conversion functions between DTO ↔ UI
└── index.ts      # Central export point
```

## Design Pattern

### 1. **DTO Layer** (`dto/`)
Represents the **exact structure** received from the backend API.

- Follows server naming conventions (snake_case)
- Contains all server fields (even if unused in UI)
- Includes API response wrappers (success, data, pagination)

**Example**: `LeadDTO.ts`
```typescript
export interface LeadDTO {
  id: string;
  company_name: string;        // snake_case
  lead_score: number;
  status: LeadStatusDTO;        // SERVER enum format
}
```

### 2. **UI Layer** (`ui/`)
Represents the **simplified structure** used throughout the application.

- Follows frontend naming conventions (camelCase)
- Only includes fields needed by components
- Uses frontend-friendly types and enums

**Example**: `Lead.ts`
```typescript
export interface Lead {
  id: string;
  companyName: string;         // camelCase
  score: number;
  status: LeadStatus;          // UI enum format
}
```

### 3. **Mapper Layer** (`mappers/`)
Handles conversion between DTO ↔ UI models.

- `mapLeadDTOToUI()` - Server → UI
- `mapUILeadToDTO()` - UI → Server
- Field transformations (snake_case ↔ camelCase)
- Enum conversions (NEW ↔ New)
- Data formatting (strings → dates, etc.)

**Example**: `LeadMapper.ts`
```typescript
export const mapLeadDTOToUI = (dto: LeadDTO): Lead => ({
  id: dto.id,
  companyName: dto.company_name,
  score: dto.lead_score,
  status: mapLeadStatusToUI(dto.status),
});
```

## Benefits

✅ **Separation of Concerns** - Server and UI models evolve independently  
✅ **Type Safety** - TypeScript ensures correct mapping  
✅ **Easy Maintenance** - Changes to API don't break UI  
✅ **Single Source of Truth** - All conversions in one place  
✅ **Testability** - Mappers can be unit tested  

## Usage

### Import from central export
```typescript
import { 
  Lead,                    // UI Model
  LeadDTO,                 // Server DTO
  mapLeadDTOToUI,          // Mapper
  mapLeadsAPIResponseToUI  // Batch mapper
} from '../models';
```

### In Services
```typescript
// Fetch from API
const response = await fetch('/api/leads');
const apiResponse: LeadsAPIResponse = await response.json();

// Map to UI models
const { leads } = mapLeadsAPIResponseToUI(apiResponse);
return leads; // Return UI models to components
```

### In Components
```typescript
import { Lead } from '../models/ui/Lead';

const MyComponent = ({ leads }: { leads: Lead[] }) => {
  // Work with clean UI models
  return <div>{leads.map(lead => lead.companyName)}</div>;
};
```

## Adding New Models

1. **Create DTO** in `dto/` folder (server format)
2. **Create UI Model** in `ui/` folder (app format)
3. **Create Mapper** in `mappers/` folder
4. **Export** in `index.ts`
5. **Use in services** to map API responses

## Example Flow

```
Server API Response
    ↓
[LeadDTO] (snake_case, server enums)
    ↓
Mapper: mapLeadDTOToUI()
    ↓
[Lead] (camelCase, UI enums)
    ↓
Components & Application Logic
```

---

**Principle**: *Keep server concerns and UI concerns separate for maximum flexibility and maintainability.*
