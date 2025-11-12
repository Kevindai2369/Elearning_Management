# Deployment Guide

This guide explains how to deploy the E-Learning Platform backend to Render.com.

## Prerequisites

- GitHub account
- Render.com account (free tier available)
- Cloudinary account (for file storage)
- Email service credentials (Gmail SMTP or SendGrid)

## Step 1: Prepare Your Repository

1. Push your code to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Step 2: Setup Render

1. Go to [Render.com](https://render.com) and sign in
2. Click "New +" and select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file

## Step 3: Configure Environment Variables

In the Render dashboard, configure the following environment variables:

### Required Variables

**Cloudinary (File Storage):**
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

**Email Service:**
- `EMAIL_HOST`: SMTP host (e.g., smtp.gmail.com)
- `EMAIL_USER`: Your email address
- `EMAIL_PASS`: Your email password or app-specific password
- `EMAIL_PORT`: 587 (default)
- `EMAIL_SECURE`: false (default)

**Client URL:**
- `CLIENT_URL`: Your Flutter app URL (for CORS)

### Auto-Generated Variables

These are automatically set by Render:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Auto-generated secret key
- `PORT`: 3000

## Step 4: Deploy

1. Click "Apply" to start the deployment
2. Render will:
   - Create a PostgreSQL database
   - Install dependencies
   - Start the server

## Step 5: Run Migrations

After the first deployment, you need to run database migrations:

1. Go to your service in Render dashboard
2. Click "Shell" to open a terminal
3. Run migrations:
```bash
npm run migrate
```

## Step 6: Seed Initial Data

Seed the database with initial admin user and sample data:

```bash
npm run seed
```

This will create:
- Admin user (email: admin@elearning.com, password: admin)
- Sample semester (Fall 2024)
- Sample course (Introduction to Computer Science)

## Step 7: Test Your API

Your API will be available at: `https://your-service-name.onrender.com`

Test the health endpoint:
```bash
curl https://your-service-name.onrender.com/api/health
```

Test login:
```bash
curl -X POST https://your-service-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@elearning.com","password":"admin"}'
```

## Step 8: Access API Documentation

Swagger documentation is available at:
```
https://your-service-name.onrender.com/api-docs
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Check that the `DATABASE_URL` environment variable is set
2. Verify the database is running in Render dashboard
3. Check the database logs for errors

### Migration Errors

If migrations fail:
1. Check the migration files in `src/migrations/`
2. Verify the database schema
3. Try running migrations manually via Shell

### Email Not Sending

If email notifications aren't working:
1. Verify email credentials are correct
2. For Gmail, enable "Less secure app access" or use App Password
3. Check email service logs

## Monitoring

- View logs in Render dashboard under "Logs" tab
- Monitor database usage under "Database" tab
- Check API metrics under "Metrics" tab

## Updating Your Deployment

To deploy updates:
1. Push changes to GitHub
2. Render will automatically detect changes and redeploy
3. Or manually trigger a deploy in Render dashboard

## Free Tier Limitations

Render free tier includes:
- 750 hours/month of runtime
- Database sleeps after 90 days of inactivity
- Service spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds

## Production Recommendations

For production use, consider:
1. Upgrading to paid tier for always-on service
2. Setting up custom domain
3. Enabling automatic backups
4. Configuring monitoring and alerts
5. Implementing rate limiting per user
6. Setting up CI/CD pipeline
7. Using environment-specific configurations

## Support

For issues:
- Check Render documentation: https://render.com/docs
- Review application logs in Render dashboard
- Check GitHub issues for known problems
