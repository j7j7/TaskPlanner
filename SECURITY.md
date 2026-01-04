# Security Configuration Guide

## Overview

This document outlines the security measures implemented in TaskPlanner and what needs to be configured in the InstantDB dashboard to ensure proper access control and prevent unauthorized data access.

## Current Security Implementation

### Application-Level Security

The application implements multiple layers of security:

1. **Query-Level Filtering**: Queries are filtered by `userId` where possible to reduce data download
2. **Client-Side Filtering**: Data is filtered using `filterBoardForUser`, `hasBoardAccess`, `hasColumnAccess`, and `hasCardAccess` functions
3. **Ownership Verification**: All update/delete operations verify ownership before executing
4. **User Authentication**: InstantDB handles authentication via magic code flow

### Query Filters Applied

- **Labels**: Filtered by `userId` - users can only query their own labels
- **User Preferences**: Filtered by `userId` - users can only query their own preferences
- **Boards**: Filtered by `userId` OR shared boards (sharedWith filtering handled in app logic)
- **Cards**: Filtered by `userId` AND `isDormant` flag - users can only query their own cards (shared cards handled in app logic)

## Required InstantDB Dashboard Configuration

**CRITICAL**: To ensure database-level security, you MUST configure access control rules in the InstantDB dashboard. The application-level filtering is not sufficient on its own.

### Access Control Rules to Configure

**IMPORTANT**: A complete `instant.perms.json` file has been created in the project root. You can either:

1. **Use the CLI** (Recommended): Run `npx instant-cli@latest push perms` to push the rules to InstantDB
2. **Manual Configuration**: Copy the contents of `instant.perms.json` and paste them into your InstantDB dashboard at https://instantdb.com/dash

The rules file includes:

- **Default deny**: All permissions default to `false` unless explicitly allowed
- **Boards**: Users can view/update their own boards or boards shared with them. Only owners can delete.
- **Columns**: Users can view/update columns they own, columns shared with them, or columns in boards they own. Only owners can delete.
- **Cards**: Users can view/update cards they own, cards shared with them, or cards in columns/boards they own. Only owners can delete.
- **Labels**: Users can only access their own labels
- **User Preferences**: Users can only access their own preferences
- **Users**: All users can view user profiles (needed for sharing UI), but only update their own profile
- **Attrs**: Prevents creation of new attribute types (schema protection)

See `instant.perms.json` in the project root for the complete rules configuration.

## Security Best Practices

### 1. Never Trust Client-Side Filtering Alone

- Application-level filtering is a defense-in-depth measure
- Database-level rules are the primary security mechanism
- Client-side filtering can be bypassed by malicious users

### 2. Verify Ownership Before Updates

All update operations verify ownership:
- `updateCardDormancy`: Checks `card.userId === currentUser.id`
- `updateCard`: Sets `isDormant: false` only for user's own cards
- `moveCard`: Only updates `isDormant` for the moved card (user's own)

### 3. Query Filtering

- Queries filter by `userId` where possible
- Shared items are handled via `sharedWith` array checks in application logic
- Dormant cards are filtered by `isDormant` flag to optimize downloads

### 4. Authentication

- Uses InstantDB's magic code authentication
- No passwords stored in application
- User sessions managed by InstantDB

## Testing Security

To verify security is working correctly:

1. **Test as Different User**: Create a second account and verify you cannot:
   - See other user's boards/columns/cards
   - Update other user's data
   - Delete other user's data

2. **Test Shared Access**: Share a board with read permission and verify:
   - User can read but not update/delete
   - User cannot see unshared columns/cards

3. **Test Spoofing Prevention**: Attempt to:
   - Manually modify queries to access other user's data
   - Update cards you don't own
   - Delete boards you don't own

All of these should be blocked by InstantDB rules if configured correctly.

## Current Limitations

1. **SharedWith Array Filtering**: InstantDB queries may not support complex `sharedWith` array filtering directly, so this is handled in application logic. Database rules should enforce this.

2. **Board/Column Ownership**: Cards inherit access from board/column owners, which requires application-level logic since InstantDB doesn't support joins in rules.

## Recommendations

1. **Configure Rules Immediately**: Set up the access control rules in InstantDB dashboard before deploying to production
2. **Regular Audits**: Periodically review access logs and test security
3. **Monitor**: Watch for unauthorized access attempts
4. **Update Rules**: As features are added, update rules accordingly

## Additional Resources

- InstantDB Permissions Documentation: https://www.instantdb.com/docs/permissions
- InstantDB Security Best Practices: https://www.instantdb.com/docs/common-mistakes

