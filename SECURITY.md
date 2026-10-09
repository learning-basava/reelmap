# Security Policy

## API Key Security

Reelmap is designed to keep API credentials secure:

- **Environment Variables Only**: `GEMINI_API_KEY` is loaded strictly from server-side environment variables and is never hardcoded.
- **Server-Side Calls**: All API calls using `GEMINI_API_KEY` are made server-side by `server.py`. The key is never transmitted to the browser client or logged in application logs.
- **Never Commit Secrets**: Do not commit `.env` files or credentials into version control. Use `.env.example` as a template for local development.

## Reporting a Vulnerability

If you discover a security vulnerability or concern within Reelmap:

1. **Do not create a public issue** on GitHub.
2. Please report the vulnerability privately to the project maintainers with a detailed description and steps to reproduce.
3. We will review and address the issue promptly.
