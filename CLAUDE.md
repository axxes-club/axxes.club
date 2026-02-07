# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beta registration landing page for afters.am/afters.xxx nightlife ticketing platform. Users enter an invite code to register for beta access.

## Commands

```bash
npm install    # Install dependencies
npm start      # Start production server (port 3000)
npm run dev    # Start development server (same as start)
```

## Architecture

**Backend** (`server.js`): Express.js server with PostgreSQL database
- `POST /api/register` - Register user with invite code, name, email
- `GET /api/check-code/:code` - Validate invite code availability
- Static files served from `/public`

**Frontend** (`public/`):
- `index.html` - Registration form
- `app.js` - Form handling and validation
- `style.css` - Styling

**Database Tables** (PostgreSQL via Neon):
- `invite_codes` - Stores codes with `code`, `is_active`, `max_uses`, `current_uses`
- `beta_registrations` - Stores registrations with `email`, `name`, `invite_code`

## Environment Variables

Requires `DATABASE_URL` in `.env` (Neon PostgreSQL connection string with SSL)
