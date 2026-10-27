# EcoRetail Firestore Security Specification

## 1. Data Invariants
1. **User Ownership**: Every inventory item and invoice record must strictly belong to the authenticated user (`userId == request.auth.uid`).
2. **Identity Integrity**: Users cannot read, list, create, update, or delete records belonging to any other user.
3. **No Blanket Reads**: Queries must enforce `resource.data.userId == request.auth.uid`.
4. **Data Integrity & Non-Negative Values**: Quantities must be non-negative numbers, pricePerUnit must be >= 0, and totalValue must equal or approximate quantity * pricePerUnit.
5. **Path Security**: Document IDs must satisfy `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, size <= 128).
6. **Immutability**: `userId` and `createdAt` must remain immutable across updates.
7. **Temporal Integrity**: `createdAt` and `updatedAt` must be validated against `request.time`.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read**: Attempting to read another user's inventory item without authentication -> REJECTED.
2. **Cross-Tenant Read**: User A authenticated reads User B's inventory item -> REJECTED.
3. **Blanket Query Scraping**: Running a broad `list` without `userId == request.auth.uid` filter -> REJECTED.
4. **Identity Spoofing on Create**: User A creates an item with `userId: "user_B"` -> REJECTED.
5. **Negative Quantity Poisoning**: Attempting to set `quantity: -10` to corrupt stock records -> REJECTED.
6. **Price Spoofing**: Attempting to inject non-numeric or NaN price -> REJECTED.
7. **Document ID Injection**: Using 2KB junk character string or directory traversal characters in document ID -> REJECTED.
8. **Ghost Field Injection (Shadow Update)**: User updates item including an unauthorized field like `isAdmin: true` -> REJECTED.
9. **Ownership Reassignment**: User attempts to update `userId` of an existing item to transfer ownership -> REJECTED.
10. **CreatedAt Tampering**: Attempting to alter `createdAt` historical timestamp during update -> REJECTED.
11. **Negative Value Tampering on Sell**: Marking as sold with negative decrement resulting in arbitrary value -> REJECTED.
12. **Cross-Tenant Invoice Tampering**: Attempting to delete or update an invoice logged by another retailer -> REJECTED.
