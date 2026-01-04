# Permissions and Access Control Summary

## Overview

TaskPlanner uses a **two-layer security model** combining database-level permissions (server-side) and application-level filtering (client-side). This document outlines what each layer enforces and how they work together.

---

## Database-Level Permissions (Server-Side)

**Location:** `instant.perms.ts` (pushed to InstantDB)

**Purpose:** First line of defense - enforced by InstantDB before any data reaches the client.

### Current Database Permissions

#### Boards
- **View:** `auth.id != null` - Any authenticated user can view all boards
- **Create:** `auth.id != null` - Any authenticated user can create boards
- **Update:** `auth.id != null` - Any authenticated user can update boards
- **Delete:** `auth.id != null && auth.id == data.userId` - Only board owners can delete

#### Columns
- **View:** `auth.id != null` - Any authenticated user can view all columns
- **Create:** `auth.id != null` - Any authenticated user can create columns
- **Update:** `auth.id != null && (auth.id == data.userId || auth.id == data.ref('boards.userId'))` - Column owners or board owners can update
- **Delete:** `auth.id != null && auth.id == data.userId` - Only column owners can delete

#### Cards
- **View:** `auth.id != null` - Any authenticated user can view all cards
- **Create:** `auth.id != null` - Any authenticated user can create cards
- **Update:** `auth.id != null && (auth.id == data.userId || auth.id == data.ref('columns.userId') || auth.id == data.ref('boards.userId'))` - Card owners, column owners, or board owners can update
- **Delete:** `auth.id != null && auth.id == data.userId` - Only card owners can delete

#### Labels
- **View:** `auth.id != null && auth.id == data.userId` - Users can only view their own labels
- **Create:** `auth.id != null && auth.id == data.userId` - Users can only create their own labels
- **Update:** `auth.id != null && auth.id == data.userId` - Users can only update their own labels
- **Delete:** `auth.id != null && auth.id == data.userId` - Users can only delete their own labels

#### User Preferences
- **View:** `auth.id != null && auth.id == data.userId` - Users can only view their own preferences
- **Create:** `auth.id != null && auth.id == data.userId` - Users can only create their own preferences
- **Update:** `auth.id != null && auth.id == data.userId` - Users can only update their own preferences
- **Delete:** `auth.id != null && auth.id == data.userId` - Users can only delete their own preferences

#### Users
- **View:** `true` - All users can view user profiles (needed for sharing UI)
- **Create:** `false` - No one can create users (handled by InstantDB auth)
- **Update:** `auth.id != null && auth.id == data.id` - Users can only update their own profile
- **Delete:** `false` - No one can delete users

#### Attrs (Schema Protection)
- **Create:** `false` - Prevents creation of new attribute types

---

## Application-Level Filtering (Client-Side)

**Location:** `src/store/useBoardStore.ts` - Functions: `filterBoardForUser`, `hasBoardAccess`, `hasColumnAccess`, `hasCardAccess`

**Purpose:** Second line of defense - filters data based on `sharedWith` arrays and enforces read/write permissions.

### Access Checking Functions

#### `hasBoardAccess(board, userId)`
- Returns `true` if:
  - User owns the board (`board.userId === userId`), OR
  - User is in the board's `sharedWith` array (any permission level)

#### `hasColumnAccess(column, userId, boardOwnerId)`
- Returns `true` if:
  - User owns the column (`column.userId === userId`), OR
  - User owns the board (`boardOwnerId === userId`), OR
  - User is in the column's `sharedWith` array (any permission level)

#### `hasCardAccess(card, userId, boardOwnerId, columnOwnerId)`
- Returns `true` if:
  - User owns the card (`card.userId === userId`), OR
  - User owns the board or column (`boardOwnerId === userId || columnOwnerId === userId`), OR
  - User is in the card's `sharedWith` array (any permission level)

#### `filterBoardForUser(board, userId)`
- Filters a board and its nested columns/cards to only show what the user has access to
- Returns `null` if user has no access to the board
- Filters columns based on `hasColumnAccess`
- Filters cards based on `hasCardAccess`
- Used by `useBoards()` and `useBoard()` hooks

### Write Permission Checking

**Location:** `src/components/layout/Sidebar.tsx` - Function: `hasBoardWriteAccess`

#### `hasBoardWriteAccess(board, userId)`
- Returns `true` if:
  - User owns the board (`board.userId === userId`), OR
  - User is in `sharedWith` with `permission === 'write'`

**Usage:** Used in UI components to:
- Show/hide edit buttons
- Enable/disable board editing
- Control sharing permissions

---

## How They Work Together

### Data Flow

1. **Query Phase:**
   - Database permissions allow authenticated users to query all boards/columns/cards
   - All data matching the broad permissions is sent to the client

2. **Filtering Phase:**
   - Application-level filtering (`filterBoardForUser`) removes data the user shouldn't see
   - Only boards/columns/cards where user is owner or in `sharedWith` are displayed

3. **Action Phase:**
   - Database permissions allow broad updates (any authenticated user can update boards/cards)
   - Application-level checks (`hasBoardWriteAccess`) prevent unauthorized actions in UI
   - Database permissions still enforce ownership for deletes

### Example: Shared Board Access

**Scenario:** User A shares a board with User B (read permission)

1. **Database Level:**
   - User B can query and receive the board data (permission: `auth.id != null`)
   - User B can update the board (permission: `auth.id != null`)

2. **Application Level:**
   - `hasBoardAccess` returns `true` (User B is in `sharedWith`)
   - `filterBoardForUser` includes the board in results
   - `hasBoardWriteAccess` returns `false` (permission is 'read', not 'write')
   - UI hides edit buttons and prevents modifications

3. **Result:**
   - User B sees the board but cannot edit it
   - If User B tries to bypass UI and update directly, database allows it (limitation - see below)

---

## Security Limitations & Considerations

### Current Limitations

1. **SharedWith Array Checking:**
   - InstantDB permissions cannot check if a specific user ID exists in `sharedWith` arrays
   - Database-level permissions are permissive (allow all authenticated users)
   - Application-level filtering enforces the actual sharing logic

2. **Write Permission Enforcement:**
   - Database allows any authenticated user to update boards/cards
   - Application-level checks (`hasBoardWriteAccess`) prevent UI actions
   - **Risk:** Malicious users could bypass UI and update shared boards with read-only access
   - **Mitigation:** Application-level checks are enforced, but not foolproof against determined attackers

3. **Data Download:**
   - All boards/columns/cards are downloaded to client (due to permissive database permissions)
   - Application filters them before display
   - **Impact:** Users download more data than they can see (performance/bandwidth consideration)

### Security Strengths

1. **Ownership Enforcement:**
   - Database strictly enforces ownership for deletes
   - Users cannot delete boards/columns/cards they don't own

2. **User-Specific Data:**
   - Labels and user preferences are strictly scoped to owners
   - No sharing mechanism for these entities (as intended)

3. **Authentication Required:**
   - All permissions require `auth.id != null`
   - Unauthenticated users cannot access any data

---

## Recommendations

### For Production

1. **Consider Server-Side Validation:**
   - If possible, add server-side middleware to validate `sharedWith` permissions before allowing updates
   - This would require InstantDB custom functions or a backend proxy

2. **Monitor Access Patterns:**
   - Log all update attempts
   - Alert on suspicious patterns (users updating boards they shouldn't have write access to)

3. **Optimize Queries:**
   - Consider querying only owned boards at database level
   - Handle shared boards separately if InstantDB supports more granular queries

4. **Document User Expectations:**
   - Make it clear that sharing permissions are enforced at application level
   - Users should understand the security model

### Current State Assessment

**Security Level:** **Moderate**
- ✅ Prevents unauthorized deletion
- ✅ Prevents unauthorized viewing (via application filtering)
- ⚠️ Allows unauthorized updates (mitigated by application checks)
- ⚠️ Downloads more data than necessary

**Suitable For:** Internal tools, trusted user bases, MVP/prototype stages

**Not Suitable For:** Public-facing apps, high-security requirements, untrusted user bases

---

## Summary Table

| Entity | Database View | Database Update | Database Delete | App-Level View | App-Level Write |
|--------|--------------|----------------|-----------------|----------------|-----------------|
| **Boards** | All auth users | All auth users | Owner only | Owner + shared | Owner + write shared |
| **Columns** | All auth users | Owner + board owner | Owner only | Owner + shared + board owner | Owner + write shared + board owner |
| **Cards** | All auth users | Owner + column/board owner | Owner only | Owner + shared + column/board owner | Owner + write shared + column/board owner |
| **Labels** | Owner only | Owner only | Owner only | Owner only | Owner only |
| **User Prefs** | Owner only | Owner only | Owner only | Owner only | Owner only |
| **Users** | All users | Self only | No one | All users | Self only |

---

## Files Reference

- **Database Permissions:** `instant.perms.ts`
- **Application Filtering:** `src/store/useBoardStore.ts` (lines 952-1014)
- **Write Access Checks:** `src/components/layout/Sidebar.tsx` (line 24-30)
- **Security Documentation:** `SECURITY.md`

