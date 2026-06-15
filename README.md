# Pneuma Seeker UI

Next.js 16 (App Router) frontend for the Pneuma Seeker chat experience. The sidebar is rendered natively and pulls state from the API for fast updates.

## Prerequisites

- Node.js 24
- Pneuma backend running (default port 8000)

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

Open the dev server in your browser on port 3000.

## Configuration

Set the backend base URL with:

```bash
NEXT_PUBLIC_PNEUMA_API_BASE=YOUR_BACKEND_BASE_URL
```

## Notes

- Chat history and sidebar state are cached in localStorage for resilience.
- Sidebar state is loaded from the combined state endpoint.
- Export actions call the existing backend endpoints for PDFs, tables, and provenance scripts.
