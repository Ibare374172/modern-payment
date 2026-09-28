# Security Specification: Mobile Payments in Modern Businesses

## 1. Data Invariants

- **Transactions (`/transactions/{transactionId}`)**:
  - Every transaction must have a valid alphanumeric transaction code matching regex `^[a-zA-Z0-9]{8,12}$` (e.g., Safaricom M-Pesa 10-char code `SB45HG98LK`).
  - Amount must be a positive number greater than 0 and less than or equal to 1,000,000 KES.
  - Payment method must be one of: `MPESA_EXPRESS`, `MPESA_TILL`, `MPESA_PAYBILL`, `AIRTEL_MONEY`, `QR_PAY`, `CARD`.
  - Status must be one of: `COMPLETED`, `PENDING`, `FAILED`, `REVERSED`.
  - Customer phone must be a string between 9 and 20 characters.
  - `createdAt` must be server-validated or immutable upon creation.
  - Terminal state locking: Completed transactions cannot have their amount or code altered.

- **Businesses (`/businesses/{businessId}`)**:
  - Till number and Paybill number must be alphanumeric strings between 4 and 10 digits.
  - Currency must be `KES`.
  - Name must be a non-empty string under 100 characters.

- **Customers (`/customers/{customerId}`)**:
  - Name must be a non-empty string under 100 characters.
  - Phone must be a non-empty string under 25 characters.
  - `totalSpent`, `transactionCount`, and `loyaltyPoints` must be non-negative integers/numbers.

- **Audits (`/audits/{auditId}`)**:
  - Discrepancy type must be one of: `MATCH`, `NOTEBOOK_OMISSION`, `TRANSCRIPTION_ERROR`, `UNVERIFIED_SMS`.
  - Amounts must be non-negative numbers.

---

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)

1. **Payload 1 (Negative Amount Injection)**:
   Attempting to record a transaction with `amount: -5000` to manipulate sales balances.
2. **Payload 2 (Ghost Field Privilege Escalation)**:
   Attempting to write `{ "isAdmin": true, "verified": true }` to `/transactions/{id}` or `/users/{id}`.
3. **Payload 3 (Invalid Transaction Code)**:
   Injecting a 2000-character string or SQL payload as a transaction code.
4. **Payload 4 (Terminal State Mutation)**:
   Attempting to change the `amount` or `code` on an existing `COMPLETED` transaction.
5. **Payload 5 (Resource Exhaustion / Jumbo Payload)**:
   Injecting a 500KB text payload into the `notes` or `customerName` field.
6. **Payload 6 (Unauthenticated Malicious Delete)**:
   Unauthenticated user attempting to drop the `/transactions` or `/businesses` master records.
7. **Payload 7 (Spoofed Email Admin Claim)**:
   Writing with `request.auth.token.email_verified == false` attempting admin bypass.
8. **Payload 8 (Invalid Payment Method Enum)**:
   Supplying `paymentMethod: "BITCOIN_UNVERIFIED"` not present in the allowed payment methods.
9. **Payload 9 (ID Poisoning Path Injection)**:
   Targeting document paths with invalid characters (e.g., `../../etc/passwd` or control chars).
10. **Payload 10 (Client-Controlled Timestamp Tampering)**:
    Sending a fabricated past date to alter sales auditing reports.
11. **Payload 11 (Negative Loyalty Points Manipulation)**:
    Subtracting loyalty points or setting negative points in customer records.
12. **Payload 12 (Direct Field Stripping)**:
    Updating a record by dropping mandatory fields like `code` or `businessId`.
