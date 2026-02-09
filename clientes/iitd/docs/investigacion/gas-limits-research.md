# Google Apps Script: Quotas, Limits & Capabilities Research

> Research date: 2026-02-05
> Purpose: Automated diploma issuance system feasibility analysis
> Primary source: https://developers.google.com/apps-script/guides/services/quotas

**IMPORTANT**: Google states "All quotas are subject to elimination, reduction, or change at any time, without notice." Always verify against the official quotas page before production deployment.

---

## 1. Triggers

### Simple Triggers
- **Types**: `onOpen(e)`, `onEdit(e)`, `onInstall(e)`, `onSelectionChange(e)`, `doGet(e)`, `doPost(e)`
- **Max execution time**: **30 seconds** per invocation
- **Cannot** call services that require authorization
- **Cannot** access bound script's other files
- `doGet(e)` and `doPost(e)` are NOT subject to the trigger quota limits
- **Source**: https://developers.google.com/apps-script/guides/triggers

### Installable Triggers
- **Types**: Time-driven (clock), on open, on edit, on form submit, on change (Sheets)
- **Can** call services requiring authorization
- **Can** be created/managed programmatically via `ScriptApp`
- **Max execution time**: **6 minutes** per invocation (same as regular scripts)
- **Source**: https://developers.google.com/apps-script/guides/triggers/installable

### Time-Driven Triggers (ClockTriggerBuilder)
- **Minimum interval**: `everyMinutes(n)` where n must be **1, 5, 10, 15, or 30**
- Also supports: `everyHours(n)`, `everyDays(n)`, `everyWeeks(n)`, `atHour(h).nearMinute(m)` and cron-like scheduling
- **Add-on restriction**: Add-ons can use time-driven triggers at most **once per hour**
- **Source**: https://developers.google.com/apps-script/reference/script/clock-trigger-builder

### Trigger Quotas (from official quotas page)
| Quota | Consumer (gmail.com) | Google Workspace |
|---|---|---|
| Triggers total per script | 20 | 20 |
| Total trigger runtime per day | 90 min | 6 hr |
| Simultaneous executions | 30 | 30 |

- **Source**: https://developers.google.com/apps-script/guides/services/quotas

> **NOTE on 30 min runtime**: Multiple sources historically referenced a 30-minute execution time for Workspace accounts, but community reports and recent documentation indicate this has been standardized to **6 minutes for all account types**. The official quotas page should be checked directly for the current value.

---

## 2. UrlFetchApp

### Quotas
| Quota | Consumer | Workspace |
|---|---|---|
| URL Fetch calls per day | 20,000 | 100,000 |
| URL Fetch response size (GET) | **50 MB** per call | **50 MB** per call |
| URL Fetch POST payload size | **50 MB** per call | **50 MB** per call |
| Total data received per day | **No limit** (removed) | **No limit** (removed) |

- The 50 MB limit and removal of daily data cap were announced in the Apps Script release notes.
- **Source**: https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
- **Quotas**: https://developers.google.com/apps-script/guides/services/quotas
- **Release notes**: https://developers.google.com/apps-script/release-notes

### Timeout
- **Hard timeout**: ~60 seconds per individual fetch request (not officially documented on the reference page, but widely reported and confirmed in the Google Issue Tracker)
- **Not configurable** via any parameter
- **Issue tracker**: https://issuetracker.google.com/issues/36761852

### Rate Limiting
- If called too many times in a short period, throws: `"Service invoked too many times in a short time"`
- Workaround: `Utilities.sleep(1000)` between calls
- Exact QPS threshold: **not officially documented** per se; the quotas page lists daily limits, not per-second limits

### Authentication
- Supports custom headers: `Authorization: Bearer <token>`
- Can use `ScriptApp.getOAuthToken()` for Google API calls
- Supports `muteHttpExceptions: true` to handle HTTP errors without throwing
- Supports `contentType`, `method`, `payload`, `headers`, `followRedirects`, `validateHttpsCertificates`
- **Source**: https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app

---

## 3. LockService

### Overview
Prevents concurrent access to code sections. Three lock scopes:
- **`getDocumentLock()`** - Shared among all users of the same document
- **`getScriptLock()`** - Shared among all users of the script
- **`getUserLock()`** - Per-user lock

### Methods (Class Lock)
| Method | Description |
|---|---|
| `hasLock()` | Returns true if lock is acquired |
| `releaseLock()` | Releases the lock |
| `tryLock(timeoutInMillis)` | Tries to acquire lock; returns `false` if timeout expires |
| `waitLock(timeoutInMillis)` | Tries to acquire lock; **throws exception** if timeout expires |

### Timeout Limits
- `tryLock` / `waitLock` accept timeout in milliseconds
- **Maximum wait timeout**: Not explicitly documented. Practical limit is bounded by the script execution time (6 minutes = 360,000 ms)
- **Lock auto-release**: Lock is automatically released when the script terminates
- Best practice: Release locks explicitly as soon as exclusive access is no longer needed

### Concurrency Model
- Locks are **advisory** (mutual exclusion among scripts that use the same lock)
- Multiple simultaneous executions (up to 30) can run; LockService is how you serialize access to shared resources
- **Source**: https://developers.google.com/apps-script/reference/lock/lock
- **Source**: https://developers.google.com/apps-script/reference/lock/lock-service

---

## 4. PropertiesService

### Types
- **Script Properties** (`getScriptProperties()`) - Shared by all users, tied to script
- **User Properties** (`getUserProperties()`) - Per-user, per-script
- **Document Properties** (`getDocumentProperties()`) - Per-document (only for bound scripts)

### Size Limits
| Limit | Value |
|---|---|
| Single property value | **9 kB** (documented) |
| Total store size (per type) | **500 kB** (documented) |

> **Note**: Community research (Kanshi Tanaike) found practical limits may differ slightly: max key+value ~524,287 bytes. But the officially documented limits are 9 kB per value and 500 kB total.

### Read/Write Quotas
- **Properties read/write per day**: Listed on the quotas page. Exact number not confirmed via search; check the official quotas page.
- **Source**: https://developers.google.com/apps-script/guides/properties
- **Reference**: https://developers.google.com/apps-script/reference/properties/properties-service

---

## 5. Drive/Docs PDF Export

### Method 1: `getAs()` (Apps Script native)
```javascript
// Open a Google Doc and convert to PDF blob
var doc = DocumentApp.openById(docId);
var pdfBlob = doc.getAs('application/pdf');

// Save to Drive
DriveApp.createFile(pdfBlob).setName('diploma.pdf');
```

### Method 2: UrlFetchApp with Drive API export endpoint
```javascript
var url = 'https://docs.google.com/document/d/' + docId + '/export?format=pdf';
var response = UrlFetchApp.fetch(url, {
  headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
});
var pdfBlob = response.getBlob();
```

### Method 3: Advanced Drive Service (files.export)
```javascript
var blob = Drive.Files.export(docId, 'application/pdf');
```

### Limits
| Limit | Value |
|---|---|
| Drive API export size | **10 MB** per file (official) |
| `getAs()` blob size | Subject to same 10 MB export limit |
| UrlFetch approach | Subject to 50 MB response limit, but the Doc export itself is still 10 MB max |

- If the document exceeds 10 MB when exported, you must use `alt=media` download for native Drive files (not applicable to Google Docs format).
- **Source**: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export
- **Export formats**: https://developers.google.com/workspace/drive/api/guides/ref-export-formats
- **Sample (generate PDFs)**: https://developers.google.com/apps-script/samples/automations/generate-pdfs

---

## 6. Runtime Limits (Master Table)

| Quota | Consumer (gmail.com) | Google Workspace |
|---|---|---|
| Script runtime per execution | 6 min | 6 min (*) |
| Custom function runtime | 30 sec | 30 sec |
| Simple trigger runtime | 30 sec | 30 sec |
| Total trigger runtime per day | 90 min | 6 hr |
| Simultaneous executions | 30 | 30 |
| URL Fetch calls per day | 20,000 | 100,000 |
| URL Fetch size per call | 50 MB | 50 MB |
| Email recipients per day | 100 | 1,500 |
| Email attachments per message | 250 | 250 |
| Triggers per script | 20 | 20 |
| Properties value size | 9 kB | 9 kB |
| Properties total store | 500 kB | 500 kB |

(*) Historically 30 min for Workspace, but reportedly standardized to 6 min. **Verify on the official page.**

- All quotas are **per user** and reset **24 hours** after the first request.
- **Source**: https://developers.google.com/apps-script/guides/services/quotas

---

## 7. MailApp / GmailApp

### Daily Send Limits
| Quota | Consumer | Workspace |
|---|---|---|
| Email recipients per day | **100** | **1,500** |
| Email body size | ~200 KB (not officially documented with precision) | Same |
| Attachment size per message | **25 MB** (Gmail standard limit) | **25 MB** |

### Key Differences
| Feature | MailApp | GmailApp |
|---|---|---|
| Send email | Yes | Yes |
| Read inbox | No | Yes |
| Manage labels/threads | No | Yes |
| Authorization scope | Narrower (send only) | Broader (full Gmail access) |
| Re-authorization frequency | Less frequent | More frequent |

### MailApp.sendEmail Options
- `to`, `subject`, `body`, `htmlBody`
- `attachments` (array of BlobSource)
- `inlineImages` (object mapping CID to BlobSource)
- `cc`, `bcc`, `replyTo`, `name`, `noReply`

### Checking Remaining Quota
```javascript
var remaining = MailApp.getRemainingDailyQuota();
Logger.log('Emails remaining today: ' + remaining);
```

- **MailApp**: https://developers.google.com/apps-script/reference/mail/mail-app
- **GmailApp**: https://developers.google.com/apps-script/reference/gmail/gmail-app

---

## 8. HtmlService / ContentService (Web App / Webhook Endpoint)

### Can Apps Script serve as a webhook endpoint? YES

Deploy the script as a **Web App** with `doPost(e)` function:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  // Process webhook payload...

  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Deployment Configuration
- **Execute as**: "Me" (script owner) or "User accessing the web app"
- **Who has access**: "Anyone" (no Google login) or "Anyone with Google account"
- URL format: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

### Limitations
| Limitation | Detail |
|---|---|
| Execution time | **6 minutes** max per request (same as regular scripts) |
| Simultaneous executions | **30** concurrent (shared across all trigger types) |
| Response must complete | No streaming; full response returned at end |
| POST body access | Via `e.postData.contents` (string) and `e.postData.type` |
| Redirect on GET | Browser GETs are redirected through Google login; programmatic GETs work fine |
| No WebSocket | No persistent connections |
| Cold start | First request after idle may take several seconds |
| CORS | Google handles CORS; can be restrictive for browser-based calls |

### HtmlService Restrictions
- All content served in **sandboxed iframe** (IFRAME mode)
- External JS/CSS must be loaded over **HTTPS**
- Links must target `_top` or `_blank`
- No access to parent page DOM
- **Source**: https://developers.google.com/apps-script/guides/html/restrictions

### ContentService
- Serves raw text (JSON, XML, plain text, etc.)
- MIME types: `JSON`, `ATOM`, `CSV`, `ICAL`, `JAVASCRIPT`, `RSS`, `TEXT`, `VCARD`, `XML`
- **Source**: https://developers.google.com/apps-script/guides/content

### Web Apps Guide
- **Source**: https://developers.google.com/apps-script/guides/web

---

## 9. Sheets API from Apps Script

### Two approaches:

#### A) SpreadsheetApp (built-in service)
- No additional setup needed
- Subject to Apps Script daily quotas
- Automatic batching/caching of read/write operations
- `SpreadsheetApp.flush()` forces pending changes to be written

#### B) Sheets API v4 (Advanced Service)
- Must enable "Google Sheets API" in the Apps Script project
- Provides more granular control (batch updates, conditional formatting, etc.)
- Subject to Sheets API quotas (separate from Apps Script quotas)

### Sheets API v4 Quotas
| Quota | Limit |
|---|---|
| Read requests per minute per project | **300** |
| Write requests per minute per project | **300** |
| Requests per minute per user per project | **60** |
| Requests per day | **Unlimited** (as long as per-minute limits are respected) |

- Each batch request (including all sub-requests) counts as **1 API request**
- 429 errors should be handled with **exponential backoff**
- **Source**: https://developers.google.com/workspace/sheets/api/limits
- **Batch guide**: https://developers.google.com/sheets/api/guides/batch

### Best Practices
- Minimize `getRange().getValue()` calls; prefer `getRange().getValues()` for batch reads
- Use `setValues()` instead of repeated `setValue()`
- Use `SpreadsheetApp.flush()` when you need writes committed before proceeding

---

## 10. Error Handling

### Try/Catch
Standard JavaScript try/catch/finally works in Apps Script (V8 runtime):
```javascript
try {
  var response = UrlFetchApp.fetch(url);
} catch (e) {
  console.error('Fetch failed: ' + e.message);
  // e.message contains the error description
  // No built-in HTTP status code in the exception for UrlFetch;
  // use muteHttpExceptions:true and check response code instead
} finally {
  // cleanup
}
```

### Logger vs console.log

| Feature | `Logger.log()` | `console.log()` / `console.error()` etc. |
|---|---|---|
| Visible in execution log | Yes | Yes |
| Persists in Cloud Logging | Only with V8 runtime | Yes |
| Log levels | Single level only | Multiple: `log`, `info`, `warn`, `error` |
| Formatted strings | No | Yes (`console.log('Count: %s', n)`) |
| JSON objects | Serializes to string | Native support |
| Recommended | Legacy | **Preferred** (V8 runtime) |

### Cloud Logging (formerly Stackdriver)
- `console.log/info/warn/error` statements are sent to **Google Cloud Logging**
- Requires a **standard GCP project** linked to the script for full access
- Default GCP project: logs visible in Apps Script dashboard execution log
- Standard GCP project: logs visible in GCP Console with full filtering/retention
- **Exception logging**: Uncaught exceptions automatically logged to Cloud Logging + Cloud Error Reporting
- Enabled by default for new projects
- **Source**: https://developers.google.com/apps-script/guides/logging

### Common Quota-Related Error Messages
| Error Message | Meaning |
|---|---|
| `Service invoked too many times in a short time` | QPS/rate limit exceeded |
| `Service using too much computer time for one day` | Daily trigger runtime exceeded |
| `Exceeded maximum execution time` | Single execution > 6 min |
| `Limit exceeded: Email Attachments Per Message` | > 250 attachments |
| `You have been creating too many resources recently` | File creation rate limit |

- **Troubleshooting**: https://developers.google.com/apps-script/guides/support/troubleshooting

---

## Summary: Diploma Issuance System Feasibility

For an automated diploma issuance system using Google Apps Script:

| Concern | Assessment |
|---|---|
| **Trigger frequency** | 1-minute minimum interval is sufficient for near-real-time processing |
| **PDF generation** | Fully supported via `getAs('application/pdf')` or UrlFetch export; 10 MB export limit is more than enough for diplomas |
| **Email sending** | Consumer: 100/day; Workspace: 1,500/day. For large batches, Workspace is required |
| **Webhook ingestion** | Fully supported via `doPost(e)` deployed as web app |
| **Concurrency** | 30 simultaneous executions; use LockService for shared resource protection |
| **Script runtime** | 6 min per execution. For large batches, process in chunks with time-driven triggers |
| **Data storage** | PropertiesService for state (500 kB max); Sheets for main data |
| **Sheets read/write** | 60 req/min/user, 300 req/min/project via API; SpreadsheetApp has its own optimizations |
| **Daily URL fetch** | 20K (consumer) / 100K (workspace) calls per day |
| **Logging/debugging** | Full Cloud Logging with `console.*` methods |

### Key Recommendations
1. Use **Google Workspace** account for 1,500 emails/day and 6 hr trigger runtime
2. Process diplomas in **batches** within 6-minute execution windows
3. Use **LockService** (script lock) to prevent duplicate processing
4. Store processing state in **Sheets** (not PropertiesService) for persistence beyond 500 kB
5. Use **exponential backoff** for any external API calls
6. Deploy webhook receiver as a **web app** with `doPost(e)`
7. Monitor with `MailApp.getRemainingDailyQuota()` before sending

---

## Official Documentation Links Index

| Topic | URL |
|---|---|
| Quotas (master page) | https://developers.google.com/apps-script/guides/services/quotas |
| Simple Triggers | https://developers.google.com/apps-script/guides/triggers |
| Installable Triggers | https://developers.google.com/apps-script/guides/triggers/installable |
| ClockTriggerBuilder | https://developers.google.com/apps-script/reference/script/clock-trigger-builder |
| UrlFetchApp | https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app |
| LockService | https://developers.google.com/apps-script/reference/lock/lock-service |
| Lock class | https://developers.google.com/apps-script/reference/lock/lock |
| PropertiesService | https://developers.google.com/apps-script/guides/properties |
| Properties class | https://developers.google.com/apps-script/reference/properties/properties |
| Drive file export | https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export |
| Export MIME types | https://developers.google.com/workspace/drive/api/guides/ref-export-formats |
| PDF generation sample | https://developers.google.com/apps-script/samples/automations/generate-pdfs |
| MailApp | https://developers.google.com/apps-script/reference/mail/mail-app |
| GmailApp | https://developers.google.com/apps-script/reference/gmail/gmail-app |
| Web Apps | https://developers.google.com/apps-script/guides/web |
| ContentService | https://developers.google.com/apps-script/guides/content |
| HtmlService restrictions | https://developers.google.com/apps-script/guides/html/restrictions |
| Sheets API limits | https://developers.google.com/workspace/sheets/api/limits |
| Sheets API batch | https://developers.google.com/sheets/api/guides/batch |
| Logging | https://developers.google.com/apps-script/guides/logging |
| Troubleshooting | https://developers.google.com/apps-script/guides/support/troubleshooting |
| Release Notes | https://developers.google.com/apps-script/release-notes |
