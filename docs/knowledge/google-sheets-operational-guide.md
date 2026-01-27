# Google Sheets Operational Guide
**For Claude Code & AI-Driven Automation**

**Stack**: Claude Code → Pabbly Connect → Google Sheets (source/staging) → Stackby (destination) → GitHub  
**Role**: Senior Data Engineer, specializing in untyped data sources within AI-orchestrated architectures  
**Status**: Active operational guidance for spreadsheet-based data automation  
**Version**: 1.0 | January 2026

> **Target Audience**: Claude Code, Pabbly JavaScript engines, and integration architects automating data flows from Google Sheets.
>
> **Prerequisite Reading**: `claude-code-operating-rules.md`, `pabbly-connect-knowledge-base.md`, `stackby-knowledge-base.md`, `integration-patterns-and-architecture.md`

---

## 0. GOOGLE SHEETS IN THIS STACK: ROLE & LIMITS

### 0.1 What Google Sheets Is (in this context)

Google Sheets functions in this architecture as:

- **Human-editable data source**: Subject-matter experts or business users append/modify rows
- **Staging ground**: Pre-ingestion transformation before Stackby persistence
- **Reporting output**: Read-only export from Stackby for analysis/sharing
- **Control table**: Watermarks, audit logs, configuration flags (if needed)
- **Low-velocity webhook fallback**: If primary API fails, manual data entry to Sheets as DLQ

### 0.2 What Google Sheets Is NOT

- **Not a database**: No transaction isolation, no distributed locking, no ACID guarantees
- **Not a source of truth for critical operations**: Changes are unversioned; editing history requires manual investigation
- **Not typed**: Fields have implicit types; same column can contain strings, numbers, dates, empty cells, formulas
- **Not a cache**: Should not be used for temporary state across workflow executions
- **Not an audit log**: No change tracking without manual versioning
- **Not meant for APIs**: 300 requests/minute per project limit; designed for human interaction

### 0.3 Correct Mental Model

**Think of Google Sheets as**:
- A human-friendly interface to a transient staging area
- Data arrives from humans (manual entry, forms, copy-paste)
- Data passes through normalization in Code by Pabbly
- Data persists in Stackby (the DB)
- Sheets is optional; the workflow does not depend on Sheets' persistence

**Core principle**: Sheets is a **source**, not a **destination of truth**.

---

## 1. DATA STRUCTURE IN GOOGLE SHEETS

### 1.1 Typical Sheet Layout

```
Row 1 (Headers):    [Email]         [Name]           [Amount]    [Status]       [JoinDate]
Row 2 (Data):       john@x.com      John Doe         1000        Active         2025-01-15
Row 3 (Data):       jane@y.com      Jane Smith       2000        Pending        01/16/2025
Row 4 (Data):       bob @z.com      Bob  Johnson     500.50      inactive       2025-01-17
Row 5 (Empty):      
Row 6 (Data):       alice@a.com     Alice Brown      1500        Active         January 18, 2025
Row 7 (Partial):    carol@c.com     (empty)          (empty)     Pending        (empty)
```

**Problems in this sheet** (typical for uncontrolled data):

| Row | Problem | Impact |
|-----|---------|--------|
| 1 | Headers defined; good | None if parseable |
| 2 | Consistent data | Baseline OK |
| 3 | Date format differs (MM/DD vs YYYY-MM-DD) | Parser must handle both |
| 4 | Email has leading space; Name has extra spaces | Lookups fail; email validation fails |
| 5 | Completely empty row | Iterator/API reads empty row as data |
| 6 | Date in textual format ("January 18, 2025") | Date parser fails; stored as text |
| 7 | Partial row (missing fields) | Null/empty handling required |

### 1.2 Headers as Contract

**Rule**: Headers ALWAYS on Row 1. No exceptions in this architecture.

- Headers are case-sensitive: `Email` ≠ `email`
- Headers must not contain special characters (spaces are OK but avoid `@`, `#`, `$`)
- **Idempotency**: Column order can change; code must match by name, not position

**Header best practices**:
```
✅ [Email] [Full Name] [Amount] [Status] [Join Date]
❌ [email] [FULL NAME] [Amount $] [status_code] [joinDate]
```

### 1.3 Rows: Data vs Structure

**Row 1**: Headers (contract/schema)  
**Rows 2+**: Data rows  
**Empty rows**: Treated as data (contain empty cells); can break iteration  
**Partial rows**: Some columns filled, others empty; must handle gracefully

**Key issue**: Humans often insert empty rows for "spacing". Algorithm must skip them or normalize them away.

### 1.4 Optional vs Missing Columns

**Observed behavior**:
- If a column exists in Sheet but is not present in expected list → extra field (ignore)
- If a column is missing from Sheet → field defaults to `null`
- If a row is shorter than header → trailing cells are empty strings or undefined

**Implication for Code**:
```javascript
// If Sheet has [Email, Name, Amount, Phone, Notes]
// But you only expect [Email, Name, Amount]
// Extra fields [Phone, Notes] must be ignored; not an error

// If Sheet has [Email, Name] but you expect [Email, Name, Phone, Notes]
// Missing fields default to null; validate before persist
```

---

## 2. UNTYPED DATA REALITY: GOOGLE SHEETS TYPE SYSTEM

### 2.1 Google Sheets "Types" (Implicit)

Google Sheets does **not enforce types at the cell level**. Any cell can contain:

| Type | Example | Storage | Problem |
|------|---------|---------|---------|
| **Text** | "john" | String | Looks like data, is data |
| **Number (real)** | 1000 | Number | Arithmetic works |
| **Number (text)** | "1000" (apostrophe prefix invisible) | String | Arithmetic fails silently |
| **Boolean** | TRUE, FALSE | Boolean | Logical ops work |
| **Boolean (text)** | "TRUE", "Yes", "1" | String | Comparisons fail |
| **Date (real)** | Jan 15, 2025 (cell formatted) | Serial number (44971) | Date ops work |
| **Date (text)** | "2025-01-15" or "01/15/2025" or "15 Jan 2025" | String | Date filters fail; sorting wrong |
| **Empty** | (blank cell) | Empty string "" or null | Comparisons ambiguous |
| **Formula result** | =SUM(A1:A10) | Computed value (type varies) | Type inferred from formula |
| **Currency (text)** | "$1,000.50" | String | Math impossible; must parse |
| **Percent (text)** | "15%" | String | Treated as text, not 0.15 |
| **Leading/trailing spaces** | " john " | String with whitespace | Lookup/comparison fails |
| **Mixed-width spaces** | "john  doe" (multiple spaces) | String with inconsistent spacing | Normalization required |
| **Non-breaking spaces** (from web paste) | \u00A0 (invisible) | Unicode whitespace | Trim() may not catch |

### 2.2 Why Type Ambiguity Breaks Everything

**Scenario**: A column labeled `Amount` contains:
- Row 2: `1000` (number)
- Row 3: `"1000"` (text that looks numeric)
- Row 4: `1000.50` (decimal)
- Row 5: `"$1,000.50"` (currency string)
- Row 6: (empty)

**Impacts**:
- **SUM formula**: Ignores text entries; total is wrong
- **Sort ascending**: Numeric 100 comes after text "999" (alphabetical)
- **Filter "Amount > 500"**: Text entries ignored by numeric comparison
- **Chart**: Mixed types force "category" axis mode; chart looks broken
- **Stackby sync**: If Amount field expects Number type, text entries fail validation

**Claude Code responsibility**: Normalize ALL types before Pabbly passes data downstream.

### 2.3 Empty Cell vs Empty String vs Null

**Google Sheets distinction**:

| State | Stored As | How to detect | API returns |
|-------|-----------|---------------|------------|
| Completely empty | (no value) | `cell === ""` or `cell == null` | `null` or `""` (varies) |
| Apostrophe-empty | `'` (prefix, invisible) | Cell looks empty; acts as text | `""` (empty string) |
| Whitespace only | `"   "` | ISBLANK() false; content false | `"   "` (spaces preserved) |
| Formula empty | `=""` | Contains formula, result empty | `""` (empty string) |
| Zero | `0` | Not empty; is zero | `0` |

**Impact on validators**:
```javascript
// WRONG: Treats empty and 0 the same
if (!value) { /* Fails for amount=0 */ }

// RIGHT: Explicit null check
if (value === null || value === undefined || value === "") { /* Handles all empty cases */ }

// RIGHT: Explicit zero check
const amount = parseFloat(value) || 0; // Treats missing as 0, not error
```

### 2.4 Dates: The Nightmare Format

**Google Sheets dates are stored as serial numbers** (days since Dec 30, 1899), but **display as formatted text**. This causes chaos in automation.

**Observed date formats in a single Sheet**:
```
2025-01-15        (ISO, unambiguous)
01/15/2025        (US: MM/DD/YYYY)
15/01/2025        (EU: DD/MM/YYYY)
2025-01-15 14:30  (ISO with time)
Jan 15, 2025      (Text, locale-dependent)
15 January 2025   (Text, locale-dependent)
44971             (Serial number, if you copy raw value)
```

**Problems**:
- 01/02/2025 could be Jan 2 or Feb 1 depending on locale
- Sorting dates stored as text sorts alphabetically, not chronologically
- Copy-pasting from email/PDF often brings non-breaking spaces → date parse fails
- Google Sheets auto-format may store as text even if it "looks like" a date

**Rule for Claude Code**: ALWAYS parse dates and normalize to ISO-8601 (YYYY-MM-DD) before Stackby.

---

## 3. REAL PROBLEMS: COMMON GOOGLE SHEETS ISSUES

### 3.1 Human Editing Side Effects

| Problem | Cause | Detection | Fix |
|---------|-------|-----------|-----|
| **Extra spaces in values** | Copy-paste from web | `value.trim() !== value` | `value.trim()` |
| **Mixed case in enums** | Manual entry | `['active', 'ACTIVE', 'Active']` | Case-normalize: `.toLowerCase()` then validate |
| **Duplicate rows** | Accidental copy-paste | Compare email/ID columns | Dedupe before insert or upsert |
| **Missing headers** | User moved column | Header count < expected | Fail early; require row 1 to be headers |
| **Inserted empty rows** | Spacing aesthetic | Row with all nulls/empty strings | Skip empty rows in normalization |
| **Formulas in data cells** | User accidentally types `=` | Cell value is formula result | Depends on formula; uncontrollable |
| **Partial rows** | User didn't fill all fields | Row length < header count | Treat missing as null; validate required |
| **Wrong data in column** | User pastes in wrong column | Type mismatch or semantic error | Validate types; warn in code |

### 3.2 API Rate Limits & Quotas

**Google Sheets API limits** (official, as of 2025):

| Limit | Value | Implication |
|-------|-------|------------|
| Read requests/minute per project | 300 | Max 5 sheets/second if 1 req per sheet |
| Read requests/minute per user | 60 | Multi-user: 60 total across all users |
| Write requests/minute per project | 300 | Same as read: 5 sheets/second max |
| Cells per batch operation | 10,000 | Split large updates into chunks |
| Ranges per batchGet | 100 | Can't fetch >100 ranges in one call |
| Value ranges per batchUpdate | 1,000 | Can't write >1,000 ranges in one call |
| Request timeout | 180 seconds | If response takes >3 min, error |
| Payload size | ~2 MB | Don't send >2MB in single request |
| Spreadsheet size | 10 million cells | Hard limit across all sheets in file |

**Pabbly + Sheets specific**:

| Action | Tasks/invocation | Rate limit impact |
|--------|-----------------|------------------|
| Get Rows (iterator off) | 1 | Multiple rows in response |
| Get Rows (iterator on, per row) | 1 | Each row = 1 task |
| Add Row | 1 | Per row added |
| Update Row | 1 | Per row updated |
| Lookup Row | 1 | Regardless of matches returned |

**Example calculation**:
- Sheet has 100 rows
- Workflow: Get Rows → Iterator (100x) → Update Row (100x)
- Total tasks: 1 (Get) + 100 (Iterator) + 100 (Update) = **201 tasks**
- This completes in <1 second (no rate limit hit), but consumes 201 of your monthly task quota

### 3.3 Lookup Action Limitations

**Pabbly Lookup Row action**:
- Returns up to **3 results** (documented limit)
- Searches **first 100 rows** only (observed limit)
- One search field only (exact match, case-sensitive)

**This breaks when**:
- Need to find >3 matches
- Data is beyond row 100
- Fuzzy/partial matching needed
- Case-insensitive search required

**Workaround**: Instead of Lookup, use Get Rows with full range, then filter in Code by Pabbly.

### 3.4 Empty Cell Handling Bug (Pabbly)

When using **Add Row** or **Update Row** in Pabbly:

If you map a field with empty value:
```
Column: [First Name] [Last Name] [Email]
Map:    john         (unmapped)  john@x.com
Result: john         (empty)     john@x.com    ← Correct
```

But if you map `{{blank}}` explicitly:
```
Column: [First Name] [Last Name] [Email]
Map:    john         {{blank}}   john@x.com
Result: john         (skipped)   john@x.com    ← Skipped, not blank
```

**Key difference**: 
- No mapping = cell gets empty/null
- `{{blank}}` = cell is skipped in the write (column position stays same)
- Use `{{blank}}` for optional fields to avoid "column shift" bug

---

## 4. NORMALIZATION RULES (IMPERATIVE FOR CLAUDE CODE)

### 4.1 String Normalization

**Rule**: Always trim AND lowercase for comparison keys.

```javascript
const normalizeString = (value) => {
  // Handle null/undefined
  if (value === null || value === undefined) return null;
  
  // Convert to string, trim whitespace
  const trimmed = String(value).trim();
  
  // Return null if empty after trim
  if (trimmed === "") return null;
  
  // Collapse internal whitespace (multiple spaces → single)
  return trimmed.replace(/\s+/g, " ");
};

// Usage:
const email = normalizeString(row.Email); // " john@x.com  " → "john@x.com"
const name = normalizeString(row.Name);   // "John   Doe" → "John Doe"
```

### 4.2 Email Normalization

```javascript
const normalizeEmail = (email) => {
  const normalized = normalizeString(email);
  if (!normalized) return null;
  
  // RFC 5322 simple check (not exhaustive)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized.toLowerCase())) {
    throw new Error(`Invalid email format: ${normalized}`);
  }
  
  return normalized.toLowerCase();
};
```

### 4.3 Number Normalization

```javascript
const normalizeNumber = (value, allowZero = true) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  // Remove currency symbols and commas
  const cleaned = String(value)
    .replace(/[$€¥₹]/g, "")
    .replace(/,/g, "")
    .trim();
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse as number: ${value}`);
  }
  
  // Optional: reject zero if not allowed
  if (parsed === 0 && !allowZero) {
    return null;
  }
  
  return parsed;
};

// Usage:
const amount = normalizeNumber(row.Amount);        // "$1,200.50" → 1200.50
const quantity = normalizeNumber(row.Qty, false);  // Empty → null, "0" → null
```

### 4.4 Boolean Normalization

```javascript
const normalizeBoolean = (value) => {
  if (value === null || value === undefined) return false;
  
  const str = String(value).toLowerCase().trim();
  
  // Accept multiple formats
  const trueValues = ["true", "yes", "y", "1", "on", "active"];
  const falseValues = ["false", "no", "n", "0", "off", "inactive"];
  
  if (trueValues.includes(str)) return true;
  if (falseValues.includes(str)) return false;
  
  // Default: empty or unrecognized → false
  return false;
};

// Usage:
const isActive = normalizeBoolean(row.Status); // "Active" → true, "" → false
```

### 4.5 Date Normalization

```javascript
const normalizeDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  // If already a Date object (from API), convert
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  
  // Try to parse string
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    // Parse failed; try common European format (DD/MM/YYYY)
    const parts = String(value).trim().split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(p => parseInt(p, 10));
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
    
    throw new Error(`Cannot parse date: ${value}`);
  }
  
  // Return in ISO-8601 format (YYYY-MM-DD)
  return date.toISOString().split("T")[0];
};

// Usage:
const joinDate = normalizeDate(row.JoinDate); // "2025-01-15", "01/15/2025", "15/01/2025", Date → "2025-01-15"
```

### 4.6 DateTime Normalization (if needed)

```javascript
const normalizeDateTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Cannot parse datetime: ${value}`);
  }
  
  // Return ISO-8601 with timezone (UTC)
  return date.toISOString();
};
```

### 4.7 Array/List Normalization (comma-separated)

```javascript
const normalizeArray = (value, separator = ",") => {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  
  // Split by separator, trim each item, filter empty
  const items = String(value)
    .split(separator)
    .map(item => item.trim())
    .filter(item => item !== "");
  
  return items;
};

// Usage:
const tags = normalizeArray(row.Tags); // "python, javascript, rust" → ["python", "javascript", "rust"]
```

### 4.8 Select/Enum Normalization

```javascript
const normalizeEnum = (value, validOptions) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  const str = String(value).trim();
  
  // Case-insensitive match
  const matched = validOptions.find(
    opt => opt.toLowerCase() === str.toLowerCase()
  );
  
  if (!matched) {
    throw new Error(`Invalid enum value: ${value}. Valid: ${validOptions.join(", ")}`);
  }
  
  return matched; // Return canonical case
};

// Usage:
const status = normalizeEnum(row.Status, ["Active", "Inactive", "Pending"]); // "active" → "Active"
```

---

## 5. DETECTION & ERROR HANDLING

### 5.1 Empty/Invalid Row Detection

```javascript
const isEmptyRow = (row) => {
  // Check if row has any non-empty, non-null values
  return Object.values(row).every(
    val => val === null || val === undefined || val === ""
  );
};

const validateRow = (row, requiredFields) => {
  const errors = [];
  
  // Check required fields
  for (const field of requiredFields) {
    const value = row[field];
    if (value === null || value === undefined || value === "") {
      errors.push(`Required field missing: ${field}`);
    }
  }
  
  return errors;
};

// Usage in iteration:
rows.forEach((row, index) => {
  if (isEmptyRow(row)) {
    console.log(`Skipping empty row ${index + 2}`); // +2 because row 1 is headers
    return; // SKIP
  }
  
  const errors = validateRow(row, ["Email", "Name"]);
  if (errors.length > 0) {
    console.log(`Row ${index + 2} errors:`, errors);
    return; // SKIP or throw, depending on strategy
  }
  
  // Process valid row
});
```

### 5.2 SKIP vs ERROR Strategy

**SKIP**: Row has problems → ignore it, continue processing other rows.  
**ERROR**: Row has problems → halt pipeline, report to DLQ.

**Decision rule**:

| Scenario | Strategy | Reason |
|----------|----------|--------|
| Empty row | SKIP | Humans insert spacing; non-data |
| Missing optional field | SKIP or default | Field is truly optional |
| Invalid email format | SKIP | Bad data; can't sync to Stackby |
| Duplicate (same email) | SKIP | Handled by dedup logic elsewhere |
| Missing required field | ERROR | Cannot proceed; alert needed |
| Invalid date that can't parse | ERROR | Data quality issue |
| Type mismatch (text where number expected) | Try parse, else ERROR | May recover, else fail |

**Implementation**:
```javascript
const result = {
  valid: [],
  skipped: [],
  errors: []
};

rows.forEach((row, index) => {
  try {
    const rowNum = index + 2; // Adjust for header row
    
    if (isEmptyRow(row)) {
      result.skipped.push({ rowNum, reason: "Empty row" });
      return;
    }
    
    const normalizedRow = {
      email: normalizeEmail(row.Email),
      name: normalizeString(row.Name),
      amount: normalizeNumber(row.Amount)
    };
    
    const errors = validateRow(normalizedRow, ["email", "name"]);
    if (errors.length > 0) {
      result.skipped.push({ rowNum, reason: errors.join("; ") });
      return;
    }
    
    result.valid.push(normalizedRow);
    
  } catch (e) {
    result.errors.push({
      rowNum: index + 2,
      message: e.message,
      rawRow: row
    });
  }
});

return result;
```

---

## 6. GOOGLE SHEETS + PABBLY CONNECT: PRACTICAL INTEGRATION

### 6.1 Get Rows Action (Retrieving Data)

**Pabbly Action**: `Get Spreadsheet Rows`

```
Configuration:
  Spreadsheet: [Select from connected account]
  Sheet Name: "Contacts" (or just pick from dropdown)
  Range: A1:E1000 (optional; defaults to all)
  Return Values: ☑ (checked, so you get actual values not formulas)
```

**What it returns**:
```json
{
  "rows": [
    {
      "Email": "john@x.com",
      "Name": "John Doe",
      "Amount": 1000,
      "Status": "Active",
      "JoinDate": "2025-01-15"
    },
    {
      "Email": "jane@y.com",
      "Name": "Jane Smith",
      "Amount": "2000",
      "Status": "pending",
      "JoinDate": "01/16/2025"
    }
  ],
  "count": 2
}
```

**Pabbly behavior**:
- Returns all rows in range (no automatic filtering)
- Empty rows are included (with null/empty values per cell)
- Headers are **excluded** (Row 1 not in output)
- Data types are inferred by Sheets (may be inconsistent)

### 6.2 Iterator Pattern (Processing Rows)

**Workflow structure**:
```
1. Get Rows (returns array of rows)
2. Iterator (repeats all downstream steps per row)
3. Code by Pabbly (normalize + validate)
4. Router (decide: CREATE/UPDATE/SKIP/ERROR)
5. Stackby Action (persist)
```

**Key insight**: Iterator divides the array into individual items. Each downstream step executes once per item.

**Cost**:
- Get Rows = 1 task
- Iterator itself = 0 tasks (control flow)
- Each iteration of downstream = N tasks (for N rows)

**Important limits**:
- Iterator with 10,000 rows = 10,000 × (downstream tasks) → easily exceeds monthly quota
- Use filters before Iterator to reduce volume
- If >500 rows, consider batching in Code by Pabbly

### 6.3 Lookup Row Action (Finding Data)

**Pabbly Action**: `Lookup Spreadsheet Row`

```
Configuration:
  Spreadsheet: [Select]
  Sheet Name: "Contacts"
  Column Name: "Email" (search field)
  Search Value: {{step_2.email}} (from trigger payload)
```

**Returns**:
- First matching row (if found) OR empty (if not found)
- Maximum 3 documented matches (observed)
- Searches first 100 rows only (observed)

**Gotchas**:
- Case-sensitive match
- Whitespace must match exactly (won't find " john@x.com" if searching "john@x.com")
- No fuzzy/partial matching
- If >3 matches exist, only first is reliably returned

**Workaround for complex lookup**:
```javascript
// In Code by Pabbly after Get Rows
const lookupRow = (rows, searchField, searchValue) => {
  return rows.find(
    row => row[searchField]?.toLowerCase().trim() === searchValue.toLowerCase().trim()
  );
};
```

### 6.4 Add Row (Appending Data)

**Pabbly Action**: `Add New Row` (or `Append Values`)

```
Configuration:
  Spreadsheet: [Select]
  Sheet Name: "Contacts"
  Column Mappings:
    Email: {{step_3.normalized.email}}
    Name: {{step_3.normalized.name}}
    Amount: {{step_3.normalized.amount}}
    Status: {{step_3.normalized.status}}
```

**Behavior**:
- Appends to first empty row after data
- Fields must match header names exactly
- Missing fields → leave cells empty (or use {{blank}})
- Returns row index if successful

**Common mistake** (field shifting):
```
Sheet headers: [First Name] [Last Name] [Email]

❌ WRONG mapping:
  First Name: john
  (skip Last Name)
  Email: john@x.com
  
Result: john | (empty) | john@x.com  ← Correct but confusing

✅ BETTER: Use {{blank}} explicitly
  First Name: john
  Last Name: {{blank}}
  Email: john@x.com
```

### 6.5 Update Row (Modifying Data)

**Pabbly Action**: `Update Row`

```
Configuration:
  Spreadsheet: [Select]
  Sheet Name: "Contacts"
  Row Number: {{step_2.rowIndex}} (from Lookup or Get Rows)
  Column Mappings:
    Status: {{step_3.status}}
    Amount: {{step_3.amount}}
```

**Critical requirement**: You MUST provide the Row Number (index). 

**Getting Row Number**:
- From Lookup → returns row index
- From Get Rows + Iterator → `{{step_2.rowIndex}}` or similar (depends on Pabbly version; check Task History)

**Behavior**:
- Updates specified fields only
- Other fields unchanged
- Overwrites entire cell value (not append)
- No return value typically

### 6.6 Common Pabbly + Sheets Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| **Authorization Required** | Multiple Google accounts logged in same browser | Use incognito window; log out other accounts |
| **Lookup returns empty** | Target row beyond first 100, or no match | Use Get Rows + Iterator instead |
| **Lookup returns only 1 of 3 matches** | Limit on matches | Use Get Rows + code filter |
| **Add Row fails silently** | Field name mismatch or bad mapping | Check exact header name (case-sensitive) |
| **Column data shifted** | Missing field not marked {{blank}} | Explicitly use {{blank}} for optional fields |
| **Values look updated but aren't** | Network latency; Sheets not refreshed | Wait 5-10s before next read |
| **Rate limit 429** | >300 requests/minute | Add Delay 60+ sec between batches |

---

## 7. CRITICAL PATTERNS FOR CLAUDE CODE

### 7.1 Sheet → Envelope → Stackby (Canonical Flow)

```javascript
/**
 * Normalize Google Sheets row into idempotent Envelope
 * @inputs input: { rows: [ { Email, Name, Amount, Status, JoinDate }, ... ] }
 * @outputs Envelope for Pabbly → Stackby
 */

const SCRIPT_VERSION = "1.0.0";
const REQUIRED_FIELDS = ["Email", "Name"];
const VALID_STATUSES = ["Active", "Inactive", "Pending"];

// Normalization functions (see Section 4)
const normalizeEmail = (email) => { /* ... */ };
const normalizeString = (value) => { /* ... */ };
const normalizeNumber = (value) => { /* ... */ };
const normalizeDate = (value) => { /* ... */ };
const isEmptyRow = (row) => { /* ... */ };

const IDEMPOTENCY_KEY_FIELDS = ["Email"]; // Stable key

function generateIdempotencyKey(normalized) {
  const keyParts = IDEMPOTENCY_KEY_FIELDS
    .map(field => `${field}:${normalized[field] || "null"}`)
    .join("|");
  return `gs:Contacts:${keyParts}`;
}

try {
  const rawRows = input.rows || [];
  const envelopes = [];
  const skipped = [];
  const errors = [];
  
  rawRows.forEach((rawRow, index) => {
    const rowNum = index + 2; // Adjust for header
    
    // Skip empty rows
    if (isEmptyRow(rawRow)) {
      skipped.push({ rowNum, reason: "Empty row" });
      return;
    }
    
    try {
      // Normalize
      const normalized = {
        email: normalizeEmail(rawRow.Email),
        name: normalizeString(rawRow.Name),
        amount: normalizeNumber(rawRow.Amount),
        status: normalizeEnum(rawRow.Status || "Pending", VALID_STATUSES),
        joinDate: normalizeDate(rawRow.JoinDate)
      };
      
      // Validate required
      const missing = [];
      for (const field of REQUIRED_FIELDS) {
        if (!normalized[field.toLowerCase()]) {
          missing.push(field);
        }
      }
      
      if (missing.length > 0) {
        skipped.push({
          rowNum,
          reason: `Missing required: ${missing.join(", ")}`
        });
        return;
      }
      
      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(normalized);
      
      // Create Envelope
      const envelope = {
        meta: {
          source_system: "google_sheets",
          source_ref: `sheet:Contacts:row:${rowNum}`,
          workflow: "WF_SHEET_IMPORT",
          run_id: `gs:${idempotencyKey}:${Date.now()}`,
          idempotency_key: idempotencyKey,
          mapping_version: SCRIPT_VERSION,
          ts_ingested: new Date().toISOString()
        },
        data: {
          raw: rawRow,
          normalized: normalized,
          targets: {
            Email: normalized.email,
            Name: normalized.name,
            Amount: normalized.amount,
            Status: normalized.status,
            JoinDate: normalized.joinDate
          }
        },
        control: {
          action: "UPSERT",  // Router will decide CREATE/UPDATE/SKIP
          reason: "Valid row, ready for persistence",
          errors: []
        }
      };
      
      envelopes.push(envelope);
      
    } catch (rowError) {
      errors.push({
        rowNum,
        message: rowError.message,
        rawData: JSON.stringify(rawRow).slice(0, 200)
      });
    }
  });
  
  // Return summary + valid envelopes
  return {
    valid: envelopes,
    skipped,
    errors,
    summary: {
      total: rawRows.length,
      valid: envelopes.length,
      skipped: skipped.length,
      errors: errors.length
    }
  };
  
} catch (e) {
  // Top-level error
  return {
    valid: [],
    skipped: [],
    errors: [{
      message: `Script error: ${e.message}`,
      stack: e.stack ? e.stack.slice(0, 500) : null
    }],
    summary: { total: 0, valid: 0, skipped: 0, errors: 1 }
  };
}
```

**Next step in Pabbly**:
1. Router: If `control.action === "UPSERT"` → branch to search
2. Search Stackby (by Email) → find existing or create
3. Update/Create accordingly
4. DLQ on errors

### 7.2 Incremental Sync with Watermark

**Control Sheet Setup**:
```
Sheet: "Control"
Row 1 (Headers): [Key] [Value]
Row 2:           last_sync_ts | 2025-01-27T10:00:00Z
Row 3:           last_sync_count | 150
```

**Code pattern**:
```javascript
// Step 1: Read control sheet
const control = input.control; // { last_sync_ts, last_sync_count }
const lastSyncTime = new Date(control.last_sync_ts);

// Step 2: Get all rows from Sheets
const allRows = input.rows;

// Step 3: Filter by "LastModified" or "UpdatedDate" >= lastSyncTime
const newRows = allRows.filter(row => {
  const updated = new Date(row.UpdatedDate || row.JoinDate);
  return updated > lastSyncTime;
});

// Step 4: Normalize new rows (as above)
const envelopes = newRows.map(row => { /* ... */ });

// Step 5: Return envelopes + new watermark for next run
return {
  envelopes,
  nextWatermark: {
    last_sync_ts: new Date().toISOString(),
    last_sync_count: envelopes.length
  }
};
```

**Pabbly follow-up**:
1. Persist envelopes
2. Update Control sheet with new watermark

### 7.3 Deduplication Before Upsert

```javascript
// In Code by Pabbly, after normalizing rows
const deduplicateByKey = (envelopes, keyFields) => {
  const seen = new Set();
  const deduplicated = [];
  
  for (const envelope of envelopes) {
    const keyValue = keyFields
      .map(field => envelope.data.normalized[field])
      .join("|");
    
    if (!seen.has(keyValue)) {
      seen.add(keyValue);
      deduplicated.push(envelope);
    } else {
      console.log(`Duplicate (deduped): ${keyValue}`);
    }
  }
  
  return deduplicated;
};

// Usage
const dedupedEnvelopes = deduplicateByKey(envelopes, ["email"]);
```

---

## 8. ANTI-PATTERNS

### ❌ Anti-Pattern 1: Trusting Visual Format

```javascript
// WRONG: Assuming a column "looks like" a number
if (value > 500) { /* This fails if value is text "1000" */ }

// RIGHT: Parse first
const num = parseFloat(value);
if (!isNaN(num) && num > 500) { /* Works */ }
```

### ❌ Anti-Pattern 2: Relying on Row Order

```javascript
// WRONG: Assuming rows are always in same order
const email = row[0]; // Index-based access
const name = row[1];

// RIGHT: Access by header name
const email = row.Email;
const name = row.Name;
```

### ❌ Anti-Pattern 3: Using Google Sheets as Cache

```javascript
// WRONG: Store state in Sheets between workflow runs
global.lastProcessedId = lastId; // Lost on next execution

// RIGHT: Persist state in Stackby control table
// ... update Control table with lastProcessedId
```

### ❌ Anti-Pattern 4: Ignoring Empty Rows

```javascript
// WRONG: Process all rows blindly
rows.forEach(row => {
  // May include empty rows with null values
  persistToStackby(row); // Fails on nulls
});

// RIGHT: Filter empty rows
rows
  .filter(row => !isEmptyRow(row))
  .forEach(row => { /* Process */ });
```

### ❌ Anti-Pattern 5: Complex Formulas in Sheets

```
❌ BAD: Google Sheets cell contains
  =IF(A1="Active", B1*1.1, B1)
  
This is uncontrollable in automation; formula logic belongs in Code by Pabbly.
```

### ❌ Anti-Pattern 6: Mixing Data & Metadata in Same Sheet

```
❌ BAD:
  Row 1: [Email] [Name] [Status]
  Row 2-100: (actual data)
  Row 101: [LAST SYNC: 2025-01-27]
  Row 102: [PROCESSED: 50 rows]
  
❌ WORSE: Inserting summary rows between data

✅ GOOD: Separate control sheet
  Sheet "Data": Rows 1+ are pure data
  Sheet "Control": Metadata (watermarks, flags)
```

---

## 9. BEST PRACTICES FOR CLAUDE CODE

### 9.1 Always Assume

✅ **ASSUME**:
1. **No schema enforcement** on Sheets cells; any cell can contain any type
2. **Headers on Row 1** as the contract (immutable for this workflow)
3. **Empty rows exist** and must be skipped
4. **Dates are ambiguous** and need explicit parsing logic
5. **Strings have leading/trailing spaces** → always trim
6. **Case variations** in enums (active, Active, ACTIVE) → normalize
7. **API rate limits** (300 req/min) → batch and add delays
8. **Pabbly Lookup limited to 3 matches + first 100 rows** → use Get Rows + code filter for complex lookups
9. **Humans will make mistakes** (missing fields, wrong data, duplicates) → validate aggressively
10. **Sheets API timeout is 180 seconds** → keep requests fast

### 9.2 Never Assume

❌ **NEVER ASSUME**:
1. All cells in a column have the same type
2. Rows are in consistent order (always reference by header name)
3. Dates are in a single format
4. Values don't have leading/trailing spaces
5. Enum values match exact case
6. Numbers are actually numbers (not text)
7. Empty cells = 0 (distinguish between null and zero)
8. Formulas in cells produce stable results
9. Sheets data persists as source of truth (it doesn't; Stackby does)
10. Workflow state survives between executions (it doesn't)

### 9.3 Validation Before Persist

**Pattern**:
```javascript
const validateBeforePersist = (envelope) => {
  // 1. Check required fields
  if (!envelope.data.normalized.email) {
    throw new Error("Email is required");
  }
  
  // 2. Check field types
  if (typeof envelope.data.normalized.email !== "string") {
    throw new Error("Email must be string");
  }
  
  // 3. Check enum values
  const validStatuses = ["Active", "Inactive", "Pending"];
  if (!validStatuses.includes(envelope.data.normalized.status)) {
    throw new Error(`Invalid status: ${envelope.data.normalized.status}`);
  }
  
  // 4. Check idempotency key
  if (!envelope.meta.idempotency_key || envelope.meta.idempotency_key.length === 0) {
    throw new Error("Idempotency key missing");
  }
  
  return true;
};
```

### 9.4 Envelope Structure is Non-Negotiable

Every output from Google Sheets normalization must be an Envelope:

```javascript
{
  meta: {
    source_system: "google_sheets",
    source_ref: "sheet:SheetName:row:N",
    workflow: "WF_NAME",
    run_id: "stable-string-with-timestamp",
    idempotency_key: "stable-key-for-dedup",
    mapping_version: "semver",
    ts_ingested: "ISO-8601"
  },
  data: {
    raw: { /* original row as-is */ },
    normalized: { /* typed, cleaned, validated */ },
    targets: { /* ready for destination field mapping */ }
  },
  control: {
    action: "CREATE|UPDATE|UPSERT|SKIP|ERROR",
    reason: "human-readable explanation",
    errors: [ /* array of error strings if action=ERROR */ ]
  }
}
```

---

## 10. EXAMPLE: END-TO-END SHEET → STACKBY SYNC

### Scenario
Sync a "Contacts" Google Sheet to Stackby table "Users".

**Source Sheet** ("Contacts"):
```
[Email]         [Name]          [Amount]  [Status]      [JoinDate]
john@x.com      John Doe        1000      Active        2025-01-15
jane@y.com      Jane Smith      2000      Pending       01/16/2025
bob@z.com       Bob Johnson     500.50    inactive      2025-01-17
(empty row)
alice@a.com     Alice Brown     1500      Active        January 18, 2025
```

**Target Table** (Stackby):
```
[Email]         [Name]          [Amount]  [Status]      [JoinDate]
(unique key)    (required)      (number)  (enum)        (date)
```

### Workflow in Pabbly

**Step 1**: Trigger → Schedule (daily at 9 AM)

**Step 2**: Get Spreadsheet Rows
- Spreadsheet: Contacts
- Range: A1:E1000

**Step 3**: Code by Pabbly (normalize + validate)
```javascript
// (See Section 7.1 for full script)
// Returns: { valid: [ Envelopes ], skipped: [], errors: [] }
```

**Step 4**: Iterator (over `valid` array from Step 3)

**Step 5**: Code by Pabbly (in iterator; decide CREATE/UPDATE)
```javascript
// Check if email exists in Stackby
// If yes → action = "UPDATE"
// If no → action = "CREATE"
const envelope = input.envelope;
envelope.control.action = existsInStackby ? "UPDATE" : "CREATE";
return envelope;
```

**Step 6**: Router (branch by `control.action`)
- If "CREATE" → Step 7a
- If "UPDATE" → Step 7b
- If "SKIP" → End (no step)
- If "ERROR" → DLQ

**Step 7a**: Stackby Create Row
- Table: Users
- Fields (map from `envelope.data.targets`):
  - Email: {{step_5.data.targets.Email}}
  - Name: {{step_5.data.targets.Name}}
  - Amount: {{step_5.data.targets.Amount}}
  - Status: {{step_5.data.targets.Status}}
  - JoinDate: {{step_5.data.targets.JoinDate}}

**Step 7b**: Stackby Update Row
- Similar mapping, with Row ID from step 5

**Result**:
- john@x.com, jane@y.com, bob@z.com, alice@a.com synced to Stackby
- Empty row skipped
- Dates normalized to ISO-8601
- Status standardized to enum value
- Amount parsed as number

---

## SUMMARY: CHECKLIST FOR GOOGLE SHEETS AUTOMATION

- [ ] **Schema**: Headers on Row 1, fixed column names
- [ ] **Type safety**: Normalize all string→number, string→date, string→enum conversions
- [ ] **Empty handling**: Skip empty rows; distinguish null from empty string from zero
- [ ] **Whitespace**: Trim leading/trailing spaces on all string fields
- [ ] **Dates**: Parse multiple formats; normalize to ISO-8601
- [ ] **Enums**: Normalize case; validate against allowed values
- [ ] **Idempotency**: Generate stable keys for deduplication
- [ ] **Envelope**: Return Envelope structure from all normalization steps
- [ ] **Error handling**: SKIP invalid rows vs ERROR on critical failures
- [ ] **Rate limits**: Respect 300 req/min quota; add Delays between batches if needed
- [ ] **Lookup limits**: Use Get Rows + code filter for >3 matches or beyond row 100
- [ ] **Control sheet**: Maintain watermarks for incremental sync
- [ ] **Testing**: Validate with sample data including edge cases (empty, spaces, type mismatches)
- [ ] **Versioning**: Include `mapping_version` in Envelope; update on schema changes
- [ ] **Monitoring**: Log skipped/error rows for debugging; don't silently drop data

---

**END OF GOOGLE SHEETS OPERATIONAL GUIDE**

This document is the canonical reference for Google Sheets as a data source in Claude Code automation. Update when new patterns emerge or limits change.
