# E-Learning Platform Backend

Backend API for the E-Learning Platform built with Node.js and Express.

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files (database, cloudinary, email)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware (auth, validation, error handling)
│   ├── models/          # Database models (Sequelize)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment variables template
├── .eslintrc.json       # ESLint configuration
├── .prettierrc.json     # Prettier configuration
├── .gitignore           # Git ignore rules
└── package.json         # Dependencies and scripts
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development server:
```bash
npm run dev
```

4. Start production server:
```bash
npm start
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/` - API information

## Environment Variables

See `.env.example` for all required environment variables.

## Technologies

- **Express.js** - Web framework
- **Sequelize** - ORM for PostgreSQL
- **JWT** - Authentication
- **Cloudinary** - File storage
- **Nodemailer** - Email service
- **Socket.IO** - Real-time communication
