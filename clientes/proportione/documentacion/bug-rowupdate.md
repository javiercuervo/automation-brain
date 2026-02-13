# Bug Report: `rowupdate` API endpoint returns HTTP 500 Internal Server Error

## Summary

The `rowupdate` endpoint (`PATCH /api/betav1/rowupdate/{stackId}/{tableId}`) consistently returns **HTTP 500 Internal Server Error** for all update operations, regardless of the field type or payload format. The `rowlist` (GET) and `rowcreate` (POST) endpoints work correctly.

## Environment

- **Stack ID:** stBBsLQwR69x3Vgs49
- **API Key:** 3usEMGGH... (active, works for reads and creates)
- **Date of issue:** February 4, 2026
- **Affected endpoint:** `PATCH /api/betav1/rowupdate/{stackId}/{tableId}`

## Steps to Reproduce

### 1. Read a row (works fine)

```
GET /api/betav1/rowlist/stBBsLQwR69x3Vgs49/tbl1770077025864393853?maxRecords=1
→ HTTP 200 OK
→ Returns row with rowId: "rw177007788983900c9ea"
```

### 2. Try to update ANY field on that row (fails)

**Simple text field update:**
```
PATCH /api/betav1/rowupdate/stBBsLQwR69x3Vgs49/tbl1770077025864393853
Content-Type: application/json
api-key: [API_KEY]

{
  "records": [{
    "rowId": "rw177007788983900c9ea",
    "field": {
      "Title": "Solutions architect at Elastic Path"
    }
  }]
}

→ HTTP 500 Internal Server Error
```

## Error Response

All update requests return the same HTML error page:

```html
<!DOCTYPE html>
<html lang="en">
<head><title>Error</title></head>
<body>
<pre>RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code:
Cannot read properties of null (reading 'length')
    at new NodeError (node:internal/errors:405:5)
    at ServerResponse.writeHead (node:_http_server:347:11)
    ...
</pre>
</body>
</html>
```

## Payloads Tested (all fail with HTTP 500)

| Test | Payload | Result |
|------|---------|--------|
| Text field | `{"records": [{"rowId": "rw...", "field": {"Title": "value"}}]}` | 500 |
| Empty string | `{"records": [{"rowId": "rw...", "field": {"Website": ""}}]}` | 500 |
| Linked record (array) | `{"records": [{"rowId": "rw...", "field": {"Company": ["rw..."]}}]}` | 500 |
| Linked record (string) | `{"records": [{"rowId": "rw...", "field": {"Company": "rw..."}}]}` | 500 |
| Linked record (object) | `{"records": [{"rowId": "rw...", "field": {"Company": [{"id": "rw..."}]}}]}` | 500 |
| Same value (no change) | `{"records": [{"rowId": "rw...", "field": {"Title": "existing value"}}]}` | 500 |

## What Works

| Endpoint | Method | Status |
|----------|--------|--------|
| `/rowlist` | GET | ✅ 200 OK |
| `/rowcreate` | POST | ✅ 200 OK |
| **`/rowupdate`** | **PATCH** | **❌ 500 Error** |

## Impact

We are migrating our CRM data from HubSpot to Stackby. We have successfully imported ~950 contacts, ~300 companies, and 62 opportunities using `rowcreate`. However, we need `rowupdate` to:

1. **Link contacts to their companies** (set the "Company" linked record field) — 236 relationships
2. **Link opportunities to their contacts** (set the "Main Contacts" field) — 53 relationships

Without `rowupdate`, we cannot establish relationships between records via the API, which is critical for our CRM data integrity.

## Request

Could you please investigate and fix the `rowupdate` endpoint? The server-side error (`Cannot read properties of null`) suggests a null pointer bug in the API handler.

If there has been a change in the API format for updates, could you provide documentation on the correct payload structure?

Thank you for your assistance.
