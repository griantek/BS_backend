# Griantek Business System API

Backend API service for Griantek business management system built with Node.js, Express, and Supabase.

## Features

### Authentication
- JWT-based authentication system
- Role-based access control (SuperAdmin, Executive)
- Secure password hashing using bcrypt

### User Management
#### SuperAdmin
- Create and login superadmin accounts
- Manage services offered
- Access to all system features

#### Executive
- Create and login executive accounts
- Create and view prospectus
- View services
- Profile management

### Prospectus Management
- Create new prospectus
- View all prospectus
- Filter prospectus by executive ID
- Search prospectus by registration ID
- Track client requirements and proposed services

### Services Management
- Create new services
- View all available services
- Service details include:
  - Service name
  - Service type
  - Description
  - Fee
  - Duration (min/max)

## API Endpoints

### SuperAdmin Routes
- POST `/api/superadmin/login` - SuperAdmin login
- POST `/api/superadmin/create` - Create new SuperAdmin

### Services Routes
- POST `/api/services/create` - Create new service (Protected)
- GET `/api/services/all` - Get all services (Protected)

### Executive Routes
- POST `/api/executive/create` - Create new executive
- POST `/api/executive/login` - Executive login
- GET `/api/executive/all` - Get all executives (Protected)

### Prospectus Routes
- POST `/api/prospectus/create` - Create new prospectus (Protected)
- GET `/api/prospectus/all` - Get all prospectus (Protected)
- GET `/api/prospectus/executive/:executiveId` - Get prospectus by executive (Protected)
- GET `/api/prospectus/register/:regId` - Get prospectus by registration ID (Protected)

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
- executive
- prospectus
- services

## Error Handling
- Standardized error responses
- Validation checks
- Authentication verification
- Database error handling

## Response Format
Success Response:
