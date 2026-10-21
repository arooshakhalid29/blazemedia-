# Security Specification: Blaze OOH Media Inventory Database

## 1. Data Invariants

1. **Media Asset Invariants**:
   - An outdoor media asset cannot be created or modified without valid structural and identification attributes (`id`, `code`, `title`, `city`, `type`, `cost`, `status`).
   - Media asset modification and deletion are strictly restricted to authenticated administrators (`admin@blaze.com.pk`).
   - Media asset inventory is publicly readable for client search, filtering, and media planning calculations.

2. **Booking Request Invariants**:
   - A booking request must include a valid `bookingId`, `assetId`, `assetCode`, `brandName`, `durationMonths` (> 0), and initial `status` ("Pending Admin Confirmation").
   - Booking requests can be submitted by prospective clients.
   - Only administrators may approve, reject, or modify booking status.

3. **Admin Directory Invariants**:
   - Administrator authorization is granted strictly to the verified official account `admin@blaze.com.pk` only. No other email (including personal Gmails) may be granted admin access.

4. **Client Account Invariants**:
   - Public self-registration is strictly forbidden.
   - Client profiles in `/users/{userId}` can ONLY be created by the verified administrator (`admin@blaze.com.pk`).
   - Clients cannot elevate their own role or assign roles to others.
   - No plaintext passwords or credentials may ever be stored in Firestore.

---

## 2. The Dirty Dozen Payloads (Targeting Rejection)

1. **Non-Admin Asset Insertion**: Attempt to create a `/mediaAssets/HACK-01` document without admin credentials.
2. **Missing Required Fields**: Attempt to create an asset missing `code`, `title`, or `city`.
3. **Ghost Fields Injection**: Attempt to create an asset with unknown shadow attributes.
4. **Invalid Media Type**: Attempt to insert an asset with `type: "SkywritingAirplane"`.
5. **Negative Rental Cost**: Attempt to submit an asset with negative monthly rental cost.
6. **Path ID Traversal / Poisoning**: Attempt to use invalid characters in document ID (`/mediaAssets/../../root`).
7. **Over-sized String Injection**: Attempt to inject 10MB string into asset description.
8. **Unauthorized Status Escalation on Booking**: Client attempts to create booking directly with `status: "Approved & Reserved"`.
9. **Unauthorized Booking Deletion**: Non-admin attempts to delete a booking record.
10. **Unauthorized Status Modification**: Non-admin attempts to update booking status to "Approved".
11. **Negative Duration Months**: Attempt to book an asset for -5 months.
12. **Admin Privilege Escalation**: Non-admin attempts to write their own UID into `/admins/{uid}`.

---

## 3. Test Payloads Reference

All Dirty Dozen payloads must fail with `PERMISSION_DENIED` under the hardened rules.
