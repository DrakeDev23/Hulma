# Security Policy & Deployment Guide

## Content Security Policy (CSP) Configuration

The application's frontend Content-Security-Policy is defined in `frontend/vercel.json`.

### Switching to Production Clerk (`pk_live`) & Custom Domain

When switching from development keys (`pk_test_...`) to production keys (`pk_live_...`) with a custom domain (e.g., `yourdomain.com`):

1. **Clerk Production DNS**: Clerk sets up DNS records pointing your custom auth subdomain to Clerk (typically `clerk.yourdomain.com`).
2. **Update `frontend/vercel.json`**:
   Replace all instances of `*.clerk.accounts.dev` with your custom Clerk production domain in the following directives:
   - **`connect-src`**:
     Replace:
     ```text
     https://super-malamute-71.clerk.accounts.dev https://*.clerk.accounts.dev wss://super-malamute-71.clerk.accounts.dev wss://*.clerk.accounts.dev
     ```
     With:
     ```text
     https://clerk.yourdomain.com wss://clerk.yourdomain.com
     ```
   - **`script-src`**:
     Replace:
     ```text
     https://super-malamute-71.clerk.accounts.dev https://*.clerk.accounts.dev
     ```
     With:
     ```text
     https://clerk.yourdomain.com
     ```
   - **`frame-src`**:
     Replace:
     ```text
     https://super-malamute-71.clerk.accounts.dev https://*.clerk.accounts.dev
     ```
     With:
     ```text
     https://clerk.yourdomain.com
     ```
