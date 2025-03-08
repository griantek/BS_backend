# Griantek Business System API

Backend API service for Graintek business management system built with Node.js, Express, and Supabase.

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (admin, entity)
- Secure password hashing with bcrypt
- Protected routes with middleware

### User Management
#### admin
- Create and login admin accounts
- Manage roles and permissions
- Manage all system features

#### entity
- Create and login entity accounts
- Create and manage prospectus
- View assigned roles and permissions
- Profile management

### Core Features
- Bank Account Management (CRUD)
- Services Management (CRUD)
- Department Management (CRUD)
- Prospectus Management
- Registration System
- Transaction Tracking
- Role Management

## API Endpoints

### Authentication Routes
- POST `/api/admin/login` - admin login
- POST `/api/admin/create` - Create new admin
- POST `/api/entity/login` - entity login
- POST `/api/entity/create` - Create new entity

### Common Routes
- GET `/api/common/bank-accounts/all` - Get all bank accounts
- GET `/api/common/bank-accounts/:id` - Get bank account by ID
- GET `/api/common/services/all` - Get all services
- GET `/api/common/services/:id` - Get service by ID
- POST `/api/common/services/create` - Create new service
- GET `/api/common/registration/all` - Get all registrations
- GET `/api/common/registration/:id` - Get registration by ID
- POST `/api/common/registration/create` - Create new registration
- DELETE `/api/common/registration/:id` - Delete registration
- GET `/api/common/transactions/all` - Get all transactions
- POST `/api/common/transactions/create` - Create new transaction

### admin Routes
- POST `/api/admin/login` - admin login
- POST `/api/admin/create` - Create new admin
- POST `/api/admin/services/create` - Create new service
- GET `/api/admin/services/all` - Get all services

### entity Routes
- POST `/api/entity/create` - Create new entity
- POST `/api/entity/login` - entity login
- GET `/api/entity/all` - Get all entity
- POST `/api/entity/prospectus/create` - Create new prospectus
- GET `/api/entity/prospectus/all` - Get all prospectus
- GET `/api/entity/prospectus/:entity` - Get prospectus by entity
- GET `/api/entity/prospectus/register/:regId` - Get prospectus by registration ID

## Technical Stack
- Node.js & Express
- Supabase (PostgreSQL)
- JWT Authentication
- bcrypt Password Hashing
- CORS enabled
- Environment variables configuration

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   PORT=5000
   BCRYPT_SALT_ROUNDS=your_salt_rounds_number
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Security Features
- Password hashing
- JWT token verification
- Protected routes
- Request validation
- Error handling
- CORS configuration

## Database Tables
- supAdmin
- entity
- prospectus
- services
- registration
- bank_accounts
- transactions

## Error Handling
- Standardized error responses
- Validation checks
- Authentication verification
- Database error handling

## Response Format
Success Response:
