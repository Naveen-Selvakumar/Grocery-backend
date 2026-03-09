# Smart Grocery Store Backend

Production-ready REST API backend for a Grocery Store Web Application built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**.

---

## Features

| Feature | Description |
|---|---|
| **Authentication** | JWT-based login/register, bcrypt password hashing, role-based access (Admin / User) |
| **Products** | CRUD, image upload (Multer), stock management, text search, price/category filter |
| **Categories** | CRUD with image upload |
| **Cart** | Add, update, remove, clear — with auto price recalculation |
| **Wishlist** | Add, remove, move-to-cart |
| **Orders** | Place order, view history, admin status updates, stock deduction |
| **Reviews & Ratings** | Submit, list, delete; auto-updates product aggregate rating |
| **Dashboard** | Total users, orders, revenue, top products, monthly trends |
| **OCR Bill Scanner** | Upload grocery bill image → Tesseract.js extracts item names |
| **Notifications** | In-app events on order placed / shipped / delivered |

---

## Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** + **bcryptjs**
- **Multer** v2 (file uploads)
- **Tesseract.js** (OCR)
- **express-validator**
- **Helmet** + **CORS** + **Morgan**

---

## Project Structure

```
backend/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js
│   ├── productController.js
│   ├── categoryController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── reviewController.js
│   ├── wishlistController.js
│   ├── dashboardController.js
│   └── ocrController.js
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Category.js
│   ├── Cart.js
│   ├── Order.js
│   ├── Review.js
│   └── Wishlist.js
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── categoryRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── reviewRoutes.js
│   ├── wishlistRoutes.js
│   ├── dashboardRoutes.js
│   └── ocrRoutes.js
├── middleware/
│   ├── authMiddleware.js      # JWT protect
│   ├── adminMiddleware.js     # Admin role guard
│   └── errorMiddleware.js     # Global error handler
├── utils/
│   ├── generateToken.js
│   └── notificationService.js
├── uploads/
│   └── productImages/         # Uploaded product/bill images
├── .env
├── server.js
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Edit .env with your own values (see below)

# 4. Start development server
npm run dev

# 5. Start production server
npm start
```

### Environment Variables (.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart_grocery_store
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## API Reference

### Auth  `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register user |
| POST | `/login` | Public | Login user |
| GET | `/profile` | Private | Get own profile |
| PUT | `/profile` | Private | Update profile |
| GET | `/users` | Admin | List all users |
| DELETE | `/users/:id` | Admin | Delete user |

### Products  `/api/products`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List products (search, filter, paginate) |
| GET | `/:id` | Public | Get single product |
| POST | `/` | Admin | Create product (multipart/form-data) |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Soft-delete product |
| PATCH | `/:id/stock` | Admin | Update stock quantity |

**Query params for GET /api/products:**
- `search` — text search
- `category` — category slug
- `minPrice` / `maxPrice` — price range
- `sort` — `price_asc`, `price_desc`, `rating`, `popular`
- `page`, `limit`

### Categories  `/api/categories`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/:id` | Public |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Cart  `/api/cart`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Private |
| POST | `/add` | Private |
| PUT | `/update` | Private |
| DELETE | `/remove` | Private |
| DELETE | `/clear` | Private |

### Orders  `/api/orders`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | Private |
| GET | `/myorders` | Private |
| GET | `/:id` | Private |
| GET | `/admin/all` | Admin |
| PUT | `/:id/status` | Admin |

### Reviews  `/api/reviews`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/` | Private |
| GET | `/:productId` | Public |
| DELETE | `/:id` | Private |

### Wishlist  `/api/wishlist`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/` | Private |
| POST | `/add` | Private |
| DELETE | `/remove` | Private |
| POST | `/move-to-cart` | Private |

### Dashboard  `/api/dashboard`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/stats` | Admin |

### OCR  `/api/ocr`

| Method | Endpoint | Access |
|---|---|---|
| POST | `/scan-bill` | Private |

Upload field name: `bill` (image file, max 10MB)

---

## Example API Responses

### POST /api/auth/register
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "665abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET /api/products?search=milk&minPrice=10&maxPrice=100&page=1&limit=5
```json
{
  "success": true,
  "data": [
    {
      "_id": "665def456...",
      "name": "Full Cream Milk 1L",
      "price": 65,
      "category": { "name": "Dairy", "slug": "dairy" },
      "quantity": 120,
      "rating": { "average": 4.5, "count": 38 },
      "image": "/uploads/productImages/product-1234567890.jpg"
    }
  ],
  "pagination": { "page": 1, "limit": 5, "total": 1, "pages": 1 }
}
```

### POST /api/ocr/scan-bill
```json
{
  "success": true,
  "message": "Bill scanned successfully",
  "data": {
    "detectedItems": ["Full Cream Milk", "Bread Brown", "Butter Unsalted", "Eggs Dozen"],
    "itemCount": 4,
    "confidence": 87.43,
    "rawText": "Full Cream Milk  1  65.00\nBread Brown     1  35.00\n..."
  }
}
```

### GET /api/dashboard/stats
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 142,
      "totalOrders": 384,
      "totalProducts": 96,
      "totalCategories": 12,
      "totalRevenue": 158420.50
    },
    "orderStatusBreakdown": {
      "Pending": 45,
      "Shipped": 23,
      "Delivered": 310,
      "Cancelled": 6
    },
    "topSellingProducts": [...],
    "recentOrders": [...],
    "monthlyRevenue": [...]
  }
}
```

---

## MongoDB Schema Overview

### User
```
name, email, password (hashed), role (user|admin),
phone, address{street, city, state, zipCode, country},
isActive, createdAt, updatedAt
```

### Product
```
name, description, price, category (ref), quantity, image,
rating{average, count}, sold, brand, unit, discount, isActive
```

### Order
```
user (ref), orderItems[{product, name, image, price, quantity}],
shippingAddress, paymentMethod, itemsPrice, taxPrice,
shippingPrice, totalPrice, orderStatus, statusHistory[], isPaid
```

---

## License

MIT
