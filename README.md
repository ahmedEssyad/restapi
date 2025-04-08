# REST API

This is a Node.js/Express backend REST API for the admin dashboard.

## Features

- Authentication system with JWT
- Product, category, and company management
- Order processing
- File uploads with Cloudinary integration
- Statistics and notifications

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   JWT_SECRET=your_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Start the server: `npm start`

## API Endpoints

- `/api/auth` - Authentication routes
- `/api/products` - Product management
- `/api/categories` - Category management
- `/api/companies` - Company management
- `/api/subcategories` - Subcategory management
- `/api/stats` - Statistics
- `/api/orders` - Order management
- `/api/home` - Homepage data
- `/api/notifications` - User notifications
- `/uploads` - File uploads and access

## Deployment

This API should be deployed to a proper hosting service like Heroku, Render, or Railway.
