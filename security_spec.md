# Security Specification - Cricket Score Pro

## 1. Data Invariants
- A match must have an `ownerId` matching the creator's UID.
- `createdAt` and `ownerId` are immutable once set.
- `updatedAt` must always be the server time.
- The `status` field controls what can be edited (e.g., cannot edit settings once live).
- Balls in an innings must have valid IDs and follow numeric constraints.

## 2. The "Dirty Dozen" Payloads (Deny Targets)
1. **Identity Spoofing**: Creating a match with another user's `ownerId`.
2. **Immutability Breach**: Updating `ownerId` of an existing match.
3. **Immutability Breach**: Updating `createdAt` of an existing match.
4. **Timestamp Fraud**: Providing a client-side `updatedAt` that doesn't match `request.time`.
5. **State Shortcut**: Moving from `setup` to `completed` without `live`.
6. **Value Poisoning**: Injecting a 1MB string into a player's name.
7. **Orphaned Writes**: Creating a ball for a match that doesn't exist (if balls were in subcollections).
8. **Unauthorized List**: Querying matches without being the owner.
9. **Ghost Fields**: Adding a `role: 'admin'` field to a User profile.
10. **Shadow Update**: Updating `settings` while match status is `completed`.
11. **Negative Score**: Setting innings score to a negative number.
12. **PII Leak**: Reading another user's private profile.

## 3. Test Runner
(Will be implemented in `firestore.rules.test.ts` if test environment is available, otherwise I will rely on logic audit).
