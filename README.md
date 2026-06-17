# Liftor

Liftor is a private business systems project built with Vite, React, TypeScript and Supabase. Public-facing pages are separated from authenticated internal workspaces.

## Local development

Requires Node.js and npm (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
npm install
npm run dev
```

Environment variables are managed at runtime by the hosting platform. See `.env.example` for the publishable variables the client expects. Do not commit a real `.env` file.

## Stack

- Vite
- React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (database, auth, edge functions)

## Structure

- Public marketing and legal pages are unauthenticated.
- Authenticated internal workspaces sit behind role-gated routes and database row-level security.
