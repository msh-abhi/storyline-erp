# Gemini Agent Instructions

This file provides project-specific context and instructions for the Gemini agent.

## Project Overview

StoryLine ERP is a comprehensive business management system. This project is the frontend, built with React, TypeScript, and Vite. It interacts with a Supabase backend.

## Key Technologies

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS
*   **Backend:** Supabase (PostgreSQL, Auth, Functions)
*   **UI Components:** Custom components in `src/components`
*   **Styling:** Tailwind CSS

## Development Workflow

1.  **Installation:** Run `npm install` to install dependencies.
2.  **Running Locally:** Run `npm run dev` to start the development server.
3.  **Building:** Run `npm run build` to create a production build.
4.  **Linting:** Run `npm run lint` to check for code style issues.

## Important Notes

*   The Supabase client is initialized in `src/lib/supabase.ts`.
*   Environment variables are managed in the `.env` file. Make sure it's configured correctly with your Supabase URL and anon key.
*   Database migrations are located in the `supabase/migrations` directory.
*   Supabase edge functions are in `supabase/functions`.
