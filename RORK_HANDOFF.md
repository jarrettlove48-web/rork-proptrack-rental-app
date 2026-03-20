# PropTrack Mobile App — Feature Parity Handoff

> Paste this into your Rork.app chat to bring the mobile app in sync with the web app.

---

## Context

The PropTrack web app (app.proptrack.app) has added several features that the mobile app doesn't have yet. The Supabase tables and RLS policies are already in place — the mobile app just needs code updates to use them.

**Supabase project:** tfshawyalkvxmryjqbzh.supabase.co
**All tables referenced below already exist with RLS enabled.**

---

## 1. Tenants Table Integration (HIGHEST PRIORITY)

The web app now uses a dedicated `tenants` table instead of storing tenant data only on the `units` table. This enables tenant history — when a tenant moves out, their record is preserved (is_active = false) instead of being deleted.

### Supabase Table: `tenants`

```
id            UUID (PK, auto)
owner_id      UUID (set automatically by trigger — do NOT pass in inserts)
unit_id       UUID (FK → units.id)
property_id   UUID (FK → properties.id)
name          TEXT
email         TEXT (nullable)
phone         TEXT (nullable)
user_id       UUID (nullable — linked when tenant signs up via invite)
lease_start   DATE (nullable)
lease_end     DATE (nullable)
move_in_date  DATE (nullable)
move_out_date DATE (nullable)
is_active     BOOLEAN (default true)
invite_code   TEXT (nullable)
created_at    TIMESTAMPTZ (auto)
```

### What to add to `types/index.ts`:

```typescript
interface Tenant {
  id: string;
  unitId: string;
  propertyId: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  isActive: boolean;
  inviteCode: string | null;
  createdAt: string;
}
```

### What to add to `DataContext.tsx`:

**Mapping function:**
```typescript
function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    propertyId: row.property_id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    userId: (row.user_id as string) ?? null,
    leaseStart: (row.lease_start as string) ?? null,
    leaseEnd: (row.lease_end as string) ?? null,
    moveInDate: (row.move_in_date as string) ?? null,
    moveOutDate: (row.move_out_date as string) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    inviteCode: (row.invite_code as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```

**Query:**
```typescript
const tenantsQuery = useQuery({
  queryKey: ['tenants', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapTenant);
  },
  enabled: !!userId,
});
```

**CRUD operations to add:**

```typescript
// Add tenant to a unit
const addTenant = useCallback(async (data: {
  unitId: string;
  propertyId: string;
  name: string;
  email?: string;
  phone?: string;
  moveInDate?: string;
  leaseStart?: string;
  leaseEnd?: string;
}) => {
  // NOTE: Do NOT pass owner_id — a Supabase trigger sets it automatically
  const { data: inserted, error } = await supabase
    .from('tenants')
    .insert({
      unit_id: data.unitId,
      property_id: data.propertyId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      move_in_date: data.moveInDate || null,
      lease_start: data.leaseStart || null,
      lease_end: data.leaseEnd || null,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;

  // Also update the unit to mark as occupied
  await supabase.from('units').update({
    is_occupied: true,
    tenant_name: data.name,
    tenant_email: data.email || '',
    tenant_phone: data.phone || '',
  }).eq('id', data.unitId);

  void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
  void queryClient.invalidateQueries({ queryKey: ['units', userId] });
  return mapTenant(inserted);
}, [userId, queryClient]);

// Move tenant out (soft delete — preserves history)
const moveTenantOut = useCallback(async (tenantId: string, unitId: string) => {
  await supabase.from('tenants').update({
    is_active: false,
    move_out_date: new Date().toISOString().split('T')[0],
  }).eq('id', tenantId);

  // Check if any active tenants remain on this unit
  const { data: remaining } = await supabase
    .from('tenants')
    .select('*')
    .eq('unit_id', unitId)
    .eq('is_active', true);

  if (!remaining || remaining.length === 0) {
    await supabase.from('units').update({
      is_occupied: false,
      tenant_name: '',
      tenant_email: '',
      tenant_phone: '',
    }).eq('id', unitId);
  } else {
    // Sync first remaining tenant to unit fields
    const next = remaining[0];
    await supabase.from('units').update({
      tenant_name: next.name,
      tenant_email: next.email || '',
      tenant_phone: next.phone || '',
    }).eq('id', unitId);
  }

  void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
  void queryClient.invalidateQueries({ queryKey: ['units', userId] });
}, [userId, queryClient]);

// Update a tenant field inline
const updateTenant = useCallback(async (tenantId: string, updates: Partial<{
  name: string;
  email: string;
  phone: string;
  move_in_date: string;
  lease_start: string;
  lease_end: string;
}>) => {
  await supabase.from('tenants').update(updates).eq('id', tenantId);
  void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
}, [userId, queryClient]);

// Helper: get active tenants for a unit
const getTenantsForUnit = useCallback((unitId: string) => {
  return tenants.filter(t => t.unitId === unitId);
}, [tenants]);
```

### UI Changes on Property Detail (`[id].tsx`):

On each unit card, instead of just showing `unit.tenantName` / `unit.tenantEmail` / `unit.tenantPhone`:

1. Fetch tenants for that unit: `const unitTenants = getTenantsForUnit(unit.id)`
2. If `unitTenants.length > 0`, render a tenant list with:
   - Each tenant's name, email, phone (editable)
   - "ACTIVE" badge
   - "Move out" button (calls `moveTenantOut`)
   - "Add tenant" button to add additional tenants
3. If no tenant records but `unit.isOccupied`, show legacy unit fields (backwards compatible)
4. If vacant, show "Add tenant" button

---

## 2. Calendar Events Table

The web app supports custom calendar events (rent reminders, inspections, move-in/out dates, etc.) stored in a dedicated table. Currently the mobile app only derives events from maintenance request dates.

### Supabase Table: `calendar_events`

```
id            UUID (PK, auto)
owner_id      UUID (FK → auth.users)
property_id   UUID (nullable, FK → properties)
unit_id       UUID (nullable, FK → units)
title         TEXT
description   TEXT (nullable)
event_date    DATE
event_type    TEXT — one of: 'maintenance', 'rent_reminder', 'move_in', 'move_out', 'inspection', 'other'
created_at    TIMESTAMPTZ (auto)
```

### What to add to `types/index.ts`:

```typescript
type CalendarEventType = 'maintenance' | 'rent_reminder' | 'move_in' | 'move_out' | 'inspection' | 'other';

interface CalendarEvent {
  id: string;
  ownerId: string;
  propertyId: string | null;
  unitId: string | null;
  title: string;
  description: string | null;
  eventDate: string;
  eventType: CalendarEventType;
  createdAt: string;
}
```

### What to add to `DataContext.tsx`:

```typescript
// Query
const calendarEventsQuery = useQuery({
  queryKey: ['calendar_events', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date');
    if (error) throw error;
    return (data ?? []).map(mapCalendarEvent);
  },
  enabled: !!userId,
});

// Add event
const addCalendarEvent = useCallback(async (data: {
  title: string;
  eventDate: string;
  eventType: CalendarEventType;
  propertyId?: string;
  unitId?: string;
  description?: string;
}) => {
  await supabase.from('calendar_events').insert({
    owner_id: userId,
    title: data.title,
    event_date: data.eventDate,
    event_type: data.eventType,
    property_id: data.propertyId || null,
    unit_id: data.unitId || null,
    description: data.description || null,
  });
  void queryClient.invalidateQueries({ queryKey: ['calendar_events', userId] });
}, [userId, queryClient]);

// Delete event
const deleteCalendarEvent = useCallback(async (eventId: string) => {
  await supabase.from('calendar_events').delete().eq('id', eventId);
  void queryClient.invalidateQueries({ queryKey: ['calendar_events', userId] });
}, [userId, queryClient]);
```

### UI Changes on Calendar screen:

1. **Merge custom events into the existing event list.** Currently you build `calendarEvents` from `requests` only. Add:
   - Custom events from the `calendar_events` table
   - Lease end dates from `tenants` where `leaseEnd` is set (auto-generated display events)

2. **Add "+" button** next to the month header to create a custom event:
   - Title (required)
   - Date (pre-filled with selected date)
   - Event type picker: Maintenance, Rent Reminder, Move-in, Move-out, Inspection, Other
   - Property picker (optional)
   - Description (optional)

3. **Color coding by event type:**
   - maintenance → orange
   - rent_reminder → green
   - move_in → blue
   - move_out → red
   - inspection → purple
   - lease_end → red (derived, not stored)
   - other → gray

---

## 3. Property Inline Editing

The web app now lets users edit property name and address directly on the property detail page by tapping a pencil icon.

### Changes to Property Detail (`[id].tsx`):

Add an "Edit" button or pencil icon next to the property name and address. On tap, show an inline input or a bottom sheet with:

- Property name (text input, required)
- Property address (text input, optional)

Save with:
```typescript
await supabase.from('properties').update({
  name: newName.trim(),
  address: newAddress.trim(),
}).eq('id', property.id);

void queryClient.invalidateQueries({ queryKey: ['properties', userId] });
```

The web uses hover-to-reveal pencil icons. For mobile, consider:
- A small pencil icon always visible next to the property name
- Or a "..." menu with "Edit property" option
- Or long-press to edit

---

## 4. Activity Log — Clickable with Related IDs

The web app now stores `related_id` and `related_property_id` on activity records so they can link to the relevant record. The mobile app already partially does this for requests — extend it to:

- `property_added` → navigate to property detail
- `unit_added` → navigate to property detail (using `related_property_id`)
- `expense_added` → navigate to expenses screen
- `tenant_invited` → navigate to property detail (using `related_property_id`)

### Activity insert pattern (make sure all inserts include related IDs):

```typescript
// When adding a property:
await supabase.from('activities').insert({
  owner_id: userId,
  type: 'property_added',
  title: 'Property added',
  subtitle: propertyName,
  related_id: newPropertyId,           // the property's ID
  related_property_id: newPropertyId,  // same for properties
});

// When adding a unit:
await supabase.from('activities').insert({
  owner_id: userId,
  type: 'unit_added',
  title: 'Unit added',
  subtitle: `${unitLabel} at ${propertyName}`,
  related_id: newUnitId,
  related_property_id: propertyId,     // parent property
});

// When adding an expense:
await supabase.from('activities').insert({
  owner_id: userId,
  type: 'expense_added',
  title: 'Expense logged',
  subtitle: `$${amount} — ${description}`,
  related_id: newExpenseId,
  related_property_id: propertyId,
});
```

---

## 5. Units — Lease End Date

The `units` table now has a `lease_end_date` column (DATE, nullable). This was added via migration and already exists in Supabase.

### Changes needed:

1. Add `leaseEndDate: string | null` to the `Unit` type
2. Add `lease_end_date` mapping in `mapUnit()`
3. Display lease end date on unit cards (with a Calendar icon)
4. Include `lease_end_date` field in the Add Unit and Edit Unit forms
5. Include in unit insert: `lease_end_date: data.leaseEndDate || null`

---

## Summary of Changes

| Area | Files to Update |
|------|----------------|
| Types | `types/index.ts` — add Tenant, CalendarEvent, update Unit |
| Data layer | `context/DataContext.tsx` — add tenant + calendar CRUD, queries |
| Property detail | `app/(tabs)/(properties)/[id].tsx` — tenant list, edit property |
| Calendar | `app/calendar.tsx` — custom events, add event modal, new colors |
| Activity routing | `app/(tabs)/(properties)/index.tsx` — expand clickable types |
| Add/Edit unit | Include `lease_end_date` in forms |

**Important reminders:**
- Do NOT pass `owner_id` when inserting into `tenants` — a Supabase trigger handles it
- The `tenants` table uses `is_active` (not `is_primary`) for current vs historical tenants
- Lease fields on tenants are `lease_start` / `lease_end` (not `lease_end_date`)
- Lease field on units is `lease_end_date` (different naming than tenants table)
- All tables have RLS enabled — queries automatically filter by the authenticated user

---

## 6. Preferred Contractors (NEW — Phase 1)

The web app now has a full contractor management system. Landlords can add preferred contractors, assign them to maintenance requests, and contractors get their own portal to view/accept/decline jobs.

### Supabase Table: `contractors`

```
id            UUID (PK, auto)
owner_id      UUID (FK → profiles.id, CASCADE)
first_name    TEXT (required)
last_name     TEXT (required)
company       TEXT (nullable)
website       TEXT (nullable)
category      TEXT — one of: 'plumber', 'electrician', 'general_contractor', 'landscaper', 'painter', 'roofer', 'hvac_tech', 'other'
phone         TEXT (nullable)
email         TEXT (nullable)
notes         TEXT (nullable)
invite_code   TEXT (unique, auto-generated hex)
user_id       UUID (nullable — set when contractor signs up via invite)
is_active     BOOLEAN (default true)
created_at    TIMESTAMPTZ (auto)
updated_at    TIMESTAMPTZ (auto)
```

RLS: Owners manage their contractors, contractors see their own record.

### Supabase Table: `request_media`

```
id            UUID (PK, auto)
request_id    UUID (FK → maintenance_requests.id, CASCADE)
media_url     TEXT (public URL from Supabase Storage)
media_type    TEXT (default 'image')
uploaded_by   UUID (FK → auth.users)
created_at    TIMESTAMPTZ (auto)
```

RLS: Owners see media for their requests, tenants manage media they uploaded, contractors see media for assigned requests.

### New columns on `maintenance_requests`

```
assigned_contractor_id  UUID (nullable, FK → contractors.id)
contractor_status       TEXT (nullable) — one of: 'pending', 'accepted', 'declined'
```

### Supabase Storage: `request-media` bucket (public, 10MB limit)

Photos are uploaded to `request-media/{requestId}/{uuid}.{ext}` and public URLs stored in `request_media` table.

### What to add to `types/index.ts`:

```typescript
type ContractorCategory = 'plumber' | 'electrician' | 'general_contractor' | 'landscaper' | 'painter' | 'roofer' | 'hvac_tech' | 'other';
type ContractorStatus = 'pending' | 'accepted' | 'declined';

interface Contractor {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  website: string | null;
  category: ContractorCategory;
  phone: string | null;
  email: string | null;
  notes: string | null;
  inviteCode: string;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RequestMedia {
  id: string;
  requestId: string;
  mediaUrl: string;
  mediaType: string;
  uploadedBy: string | null;
  createdAt: string;
}
```

Also update `MaintenanceRequest` to add:
```typescript
assignedContractorId: string | null;
contractorStatus: ContractorStatus | null;
```

### Category mapping (request → contractor):

```typescript
const REQUEST_TO_CONTRACTOR_CATEGORY: Record<RequestCategory, ContractorCategory> = {
  plumbing: 'plumber',
  electrical: 'electrician',
  hvac: 'hvac_tech',
  appliance: 'general_contractor',
  other: 'other',
};
```

### CRUD operations to add to `DataContext.tsx`:

```typescript
// Fetch contractors
const contractorsQuery = useQuery({
  queryKey: ['contractors', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('is_active', true)
      .order('first_name');
    if (error) throw error;
    return (data ?? []).map(mapContractor);
  },
  enabled: !!userId,
});

// Add contractor
const addContractor = useCallback(async (data: {
  firstName: string;
  lastName: string;
  category: ContractorCategory;
  company?: string;
  website?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) => {
  const { data: inserted, error } = await supabase
    .from('contractors')
    .insert({
      owner_id: userId,
      first_name: data.firstName,
      last_name: data.lastName,
      category: data.category,
      company: data.company || null,
      website: data.website || null,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Log activity
  await supabase.from('activities').insert({
    owner_id: userId,
    type: 'contractor_added',
    title: 'Contractor added',
    subtitle: `${data.firstName} ${data.lastName}${data.company ? ` — ${data.company}` : ''}`,
    related_id: inserted.id,
  });

  void queryClient.invalidateQueries({ queryKey: ['contractors', userId] });
  return mapContractor(inserted);
}, [userId, queryClient]);

// Remove contractor (soft delete)
const removeContractor = useCallback(async (contractorId: string) => {
  await supabase.from('contractors').update({ is_active: false }).eq('id', contractorId);
  void queryClient.invalidateQueries({ queryKey: ['contractors', userId] });
}, [userId, queryClient]);

// Assign contractor to request
const assignContractor = useCallback(async (requestId: string, contractorId: string) => {
  await supabase.from('maintenance_requests').update({
    assigned_contractor_id: contractorId,
    contractor_status: 'pending',
    updated_at: new Date().toISOString(),
  }).eq('id', requestId);
  void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
}, [userId, queryClient]);

// Unassign contractor
const unassignContractor = useCallback(async (requestId: string) => {
  await supabase.from('maintenance_requests').update({
    assigned_contractor_id: null,
    contractor_status: null,
    updated_at: new Date().toISOString(),
  }).eq('id', requestId);
  void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
}, [userId, queryClient]);
```

### Photo upload for tenant maintenance requests:

```typescript
// Upload photos when creating a request
const uploadRequestMedia = useCallback(async (requestId: string, files: { uri: string; type: string; name: string }[]) => {
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${requestId}/${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase Storage
    const response = await fetch(file.uri);
    const blob = await response.blob();
    await supabase.storage.from('request-media').upload(filePath, blob, { contentType: file.type });

    // Get public URL and insert row
    const { data: urlData } = supabase.storage.from('request-media').getPublicUrl(filePath);
    await supabase.from('request_media').insert({
      request_id: requestId,
      media_url: urlData.publicUrl,
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
      uploaded_by: userId,
    });
  }
}, [userId]);
```

### Plan gating:

```typescript
const PLAN_LIMITS = {
  starter: { maxContractors: 0 },
  essential: { maxContractors: 5 },
  pro: { maxContractors: Infinity },
};
```

Starter users see a locked screen with upgrade CTA. Essential gets 5 contractors. Pro unlimited.

### UI screens to add:

**1. Contractors list screen (landlord)**
- List: name, company, category badge, phone, email, invite status (Joined/Pending)
- Add modal: first name, last name, company, category picker, phone, email, website, notes
- Inline edit, soft delete
- Copy invite link button (generates `{appUrl}/contractor-invite?code={inviteCode}`)
- Plan gating check before adding

**2. Request detail — contractor assignment**
- On each request card, show "Assign contractor" button
- Smart dropdown: category-matched contractors shown first as "Best match", then others
- After assignment: show contractor name + status badge (Pending/Accepted/Declined)
- Unassign option

**3. Request creation — required photo upload (tenant)**
- File picker: images/videos, up to 5
- Preview thumbnails with remove button
- Required: at least 1 photo to submit
- Upload flow: create request → upload to Storage → insert request_media rows

**4. Request detail — photo gallery**
- Show thumbnail grid of request_media images
- Tap to view full size

### RPCs available:

```sql
-- Verify contractor invite code (returns JSON with valid, contractor_id, company, owner_name)
verify_contractor_invite_code(code TEXT) → JSON

-- Redeem contractor invite (links user to contractor record, sets role to 'contractor')
redeem_contractor_invite(code TEXT, uid UUID) → VOID
```

### Activity types added:
- `contractor_added` → navigate to contractors list
- `contractor_assigned` → navigate to requests list

---

## Updated Summary of Changes

| Area | Files to Update |
|------|----------------|
| Types | `types/index.ts` — add Contractor, ContractorCategory, ContractorStatus, RequestMedia; update MaintenanceRequest |
| Data layer | `context/DataContext.tsx` — add contractor CRUD, assignment, photo upload, queries |
| Contractors screen | NEW — full CRUD list with add modal, edit, delete, invite link copy |
| Request detail | Add contractor assignment dropdown (smart category matching), photo gallery |
| Request creation (tenant) | Required photo upload with camera/gallery picker |
| Calendar | (from previous) — custom events, add event modal |
| Property detail | (from previous) — tenant list, edit property |
| Activity routing | Add `contractor_added` → contractors, `contractor_assigned` → requests |
| Plan gating | Add `maxContractors` check (starter=0, essential=5, pro=unlimited) |
