# Inventory Management System - InventoryPro

## Overview

This is a full-stack inventory management system built with React/TypeScript frontend, Express.js backend, and in-memory storage. The application provides comprehensive inventory control with a three-stage counting process, audit logs, and complete workflow management for stock tracking.

## Recent Changes (July 26, 2025)

✓ **Migration Completed**: Successfully migrated from Replit Agent to Replit environment  
✓ **SQL Server Integration**: Fully configured SQL Server database connection (54.232.194.197)  
✓ **Database Setup**: Created all required tables with proper schema and relationships  
✓ **Storage Layer**: Implemented complete SimpleStorage class with all CRUD operations  
✓ **Authentication**: Working login system with bcrypt password hashing  
✓ **Default Data**: Inserted admin user, categories, locations, and inventory types  
✓ **API Routes**: Fixed all TypeScript compilation errors and implemented complete REST API  
✓ **Error Handling**: Added proper error handling and type safety throughout application  
✓ **System Testing**: Application running successfully on port 5000 with full functionality

**Current Login Credentials**: username: `admin`, password: `password`

## User Request (July 27, 2025)

✓ **View-Only Screens**: Modified Products, Categories, and Stock Locations screens to be read-only interfaces
✓ **Cost Value Field**: Added "Valor do Bem" column to Products screen (costValue field from database)
✓ **Mobile Optimization**: Enhanced responsive design with mobile-friendly navigation and touch-optimized controls
→ **User Management**: Creating comprehensive user management system with role-based permissions (Admin, Consulta, Contador, Gerente, Supervisor)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: SQL Server 2019 with mssql driver (54.232.194.197)
- **Storage Layer**: Complete SimpleStorage class with all CRUD operations for all entities
- **Authentication**: Session-based auth with bcrypt password hashing
- **Session Management**: Express sessions with in-memory store
- **API Design**: Full REST API with proper error handling and audit logging

### Key Design Decisions

1. **Monorepo Structure**: Single repository with `client/`, `server/`, and `shared/` directories for code organization
2. **Shared Schema**: Common TypeScript types and Zod schemas in `shared/` folder used by both frontend and backend
3. **Type Safety**: End-to-end TypeScript with runtime validation using Zod
4. **Modern React Patterns**: Functional components with hooks, no class components

## Key Components

### Database Layer
- **Database**: SQL Server 2019 with connection string authentication
- **Storage**: SimpleStorage class with direct mssql queries
- **Schema**: TypeScript types defined in `shared/schema.ts`
- **Setup**: Automated table creation and default data insertion

### Authentication System
- **Provider**: Replit Auth integration for user management
- **Session Storage**: PostgreSQL-backed sessions with `connect-pg-simple`
- **Route Protection**: Middleware to ensure authenticated access to API endpoints

### API Layer
- **RESTful Design**: Standard HTTP methods for CRUD operations
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Request Validation**: Zod schemas validate incoming request data

### Frontend Data Flow
- **Query Client**: TanStack Query manages server state with caching
- **Form Handling**: React Hook Form with Zod resolvers for validation
- **Component Architecture**: Reusable UI components with props interface

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **API Requests**: Frontend makes authenticated requests to Express endpoints
3. **Data Validation**: Zod schemas validate data on both client and server
4. **Database Operations**: Drizzle ORM executes type-safe queries against PostgreSQL
5. **State Management**: React Query caches responses and manages loading states
6. **UI Updates**: React components re-render based on query state changes

### Core Entities
- **Products**: SKU-based product catalog with categories
- **Locations**: Storage location management
- **Stock**: Product-location quantity associations
- **Inventories**: Inventory counting sessions with types and status
- **Counts**: Individual counting records (up to 3 per inventory item)
- **Audit Logs**: Complete operation tracking for compliance

## External Dependencies

### Production Dependencies
- **Storage**: In-memory storage implementation (MemStorage class)
- **UI Components**: Radix UI primitives for accessibility
- **Date Handling**: date-fns for date manipulation
- **Authentication**: Replit OpenID Connect provider
- **Sessions**: Memory-based session storage

### Development Tools
- **Build**: Vite with React plugin and TypeScript support
- **Code Quality**: TypeScript compiler for type checking
- **Database**: Drizzle Kit for schema management and migrations

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite compiles React app to static assets in `dist/public`
2. **Backend Build**: ESBuild bundles Express server to `dist/index.js`
3. **Database Migrations**: Drizzle Kit pushes schema changes to PostgreSQL

### Production Configuration
- **Server**: Express serves both API and static frontend files
- **Database**: PostgreSQL connection via environment variable
- **Authentication**: Replit Auth configuration for production domain
- **Session Storage**: PostgreSQL table for session persistence

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Allowed domains for authentication
- `ISSUER_URL`: OpenID Connect issuer endpoint

The application is designed for deployment on Replit but can be adapted for other platforms with appropriate environment configuration.