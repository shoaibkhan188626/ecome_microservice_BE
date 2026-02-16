# Security Guide

## Authentication
- JWT-based tokens issued by the Auth Service
- Access tokens for short-lived access; refresh tokens for renewal

## Secrets Management
- Do not commit secrets to the repository
- Use environment variables locally; use a secrets manager in production

## Data Protection
- Hash passwords (e.g., bcrypt) and store salted hashes
- Limit sensitive logging; use structured logs without secrets

## Rate Limiting & Abuse Prevention
- Apply rate limiting at the API Gateway and per-service when needed
- Consider IP-based throttling for login attempts

## Transport
- Run behind TLS in production (terminate at reverse proxy or gateway)

## Hardening
- Validate inputs using shared validators
- Principle of least privilege for infrastructure credentials
