# Pneuma-Seeker UI

The frontend interface for [Pneuma-Seeker](https://github.com/TheDataStation/pneuma-seeker).

## Prerequisites

* **Docker** (for containerized deployment)
* **Node.js 20+** (for local development)
* A running **Pneuma-Seeker Backend** instance

Ensure your backend API URL is correctly configured in `config.ts` (or your local environment variables) before proceeding.

---

## Deployment (Docker)

```bash
docker compose up -d
```

## Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run the test suite
npm test
```
