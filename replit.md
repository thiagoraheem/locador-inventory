# Sistema Locador - Módulo Inventário

## Overview

This is a full-stack inventory management system designed for comprehensive inventory control, featuring a three-stage counting process, audit logs, and complete workflow management for stock tracking. The system aims to provide robust inventory control, including multi-stage counting, precise accuracy calculations, and detailed audit trails. It supports a three-stage counting process, asset inventory control, and real-time tracking of inventory status and progress.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Design Decisions**: Responsive design with mobile-optimized interfaces and touch-friendly controls. Mobile-first approach for counting screens.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript
- **Database**: SQL Server 2019
- **Storage Layer**: SimpleStorage class handles all CRUD operations
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **Session Management**: Express sessions
- **API Design**: Full REST API with error handling and audit logging

### Key Design Decisions

- **Monorepo Structure**: Organized into `client/`, `server/`, and `shared/` directories.
- **Shared Schema**: Common TypeScript types and Zod schemas in `shared/` for consistent validation across frontend and backend.
- **Type Safety**: End-to-end TypeScript with runtime validation using Zod.
- **Modern React Patterns**: Utilizes functional components and hooks.
- **Core Entities**: Products, Locations, Stock, Inventories, Counts, and Audit Logs are central to the system.
- **Multi-Stage Inventory Process**: Implements a sophisticated inventory workflow with four counting stages (count1-4), dynamic status transitions, and automated final quantity calculations based on business rules.
- **Auditing**: Comprehensive audit logging for all counting and status operations.
- **Freezing Mechanism**: Simplifies inventory data freezing to only `stock` and `stock_items` tables for snapshots during inventory.
- **Asset Control**: Dedicated tables and APIs for managing patrimonial items by serial number, including reconciliation and tracking found/missing items.

## External Dependencies

- **Database**: SQL Server 2019
- **UI Components**: Radix UI
- **Date Handling**: date-fns
- **Authentication**: Replit OpenID Connect provider