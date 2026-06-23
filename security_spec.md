# Security Specification - Pioneer League CMS

## Data Invariants
- A news article must have a valid title, category, and content.
- Only authenticated users can create or modify news articles.
- The authorId of a news article must match the UID of the user who created it.
- createdAt and authorId are immutable after creation.

## The Dirty Dozen Payloads
1. **Unauthenticated Write**: Creating news without auth.
2. **Identity Spoofing**: Creating news for another user's authorId.
3. **Invalid ID**: Using a 1MB string as a document ID.
4. **Schema Violation**: Creating news without a title.
5. **Type Poisoning**: Sending `featured` as a string instead of a boolean.
6. **Immutable Field Update**: Attempting to change `authorId`.
7. **Time Spoofing**: Setting a future `createdAt` date from client.
8. **Resource Exhaustion**: Sending 10MB of "garbage" text in a field.
9. **Role Escalation**: Setting `featured: true` by a non-admin (if implemented).
10. **Unauthorized Update**: Modifying someone else's news article (if multi-editor).
11. **Path Injection**: Using special characters in collection names.
12. **Blanket Read Request**: Trying to read all news without filters (if rules require filters).

## The Test Runner
A `firestore.rules.test.ts` will be created to verify these.
