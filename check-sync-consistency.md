# Sync Provider Consistency Check

## Google
- Endpoint: `/api/sync/google?accountId={id}` (POST)
- accountId: **Query string** ✅
- Body: { action: "sync", accountId }

## Microsoft  
- Endpoint: `/api/sync/microsoft/callback` (POST)
- accountId: **Request body** ✅
- Body: { accountId }

## iCloud
- Endpoint: `/api/sync/icloud` (POST)
- accountId: **Request body** ✅
- Body: { action: "sync", accountId }

## CalDAV
- Endpoint: `/api/sync/caldav` (POST)
- accountId: **Request body** ✅
- Body: { action: "sync", accountId }

## Dashboard Layout Implementation
All providers send accountId in body ✅
Google additionally has it in query string ✅
