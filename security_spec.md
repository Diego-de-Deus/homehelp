# Security Specification - HomeHelp

## 1. Data Invariants
- A `ServiceRequest` must have a valid `clientId` that matches the creator's UID.
- A `Chat` must include the current user in the `participants` list.
- A `Message` can only be sent to a `Chat` where the sender is a participant.
- A `User` can only modify their own profile (except for status-like fields if applicable).

## 2. The "Dirty Dozen" Payloads
1. Create a `User` profile with a different `uid`.
2. Update a `User` profile's `email` (PII) if they don't own it.
3. Create a `ServiceRequest` with someone else's `clientId`.
4. Update a `ServiceRequest` status as a non-involved user.
5. Send a `Message` to a `Chat` I'm not a participant of.
6. Delete a `Message` sent by someone else.
7. Inject a 2MB string into a `description` field.
8. Create a `Chat` without including myself.
9. List all `User` profiles (pii risk).
10. Update a `User`'s `isVerified` field (privilege escalation).
11. Query all `ServiceRequests` without filtering by `clientId`.
12. Inject a malicious object as a `participants` list.

## 3. Test Runner
(Placeholder for actual test logic if I were running a test suite, but I'll focus on the rules implementation now).
