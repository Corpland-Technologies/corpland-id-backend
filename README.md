# corpland-id-backend

Corpland ID: the identity service. Owns accounts, sessions, tokens and email verification for
Corpland Web, Corpland Mobile and the admin surfaces.

Base path: `/api/v1`

## Sign up is idempotent

`POST /api/v1/users` can be called repeatedly with the same body and will never dead end.
This exists because a signup that times out after the account was already written used to
leave the user stranded behind an "Email already in use" wall.

Request

```json
{ "name": "Ama Mensah", "email": "ama@example.com", "password": "..." }
```

Responses

| Condition | Status | Body |
|---|---|---|
| New email | 200 | `{ SUCCESS: true, message, data: { user, token, nextStep, otpSent, resumed: false } }` |
| Email exists, not deleted, password matches | 200 | same shape with `resumed: true` |
| Email exists, unverified, password differs | 409 | `{ message, code: "EMAIL_UNVERIFIED_EXISTS", errors: { emailVerified: false } }` |
| Email exists, verified, password differs | 409 | `{ message, code: "EMAIL_IN_USE", errors: { emailVerified: true } }` |
| Account soft deleted | 409 | `{ message, code: "ACCOUNT_DELETED" }` |
| Field validation failed | 400 | `{ success: false, errors: [ { msg, path, ... } ] }` |
| Rate limited | 429 | `{ message, code: "TOO_MANY_REQUESTS" }` |

`nextStep` is `"VERIFY_EMAIL"` while `emailVerified` is false, otherwise `"COMPLETE_PROFILE"`.
Clients should route on `nextStep`, and branch on `code` rather than on message text.

`otpSent` reports whether the verification code was handed to the mailer. The account is
created either way, so a client that sees `otpSent: false` should surface the resend
affordance rather than treat the signup as failed.

Matching on the password is deliberate. Knowing the password proves ownership exactly as
`POST /users/login` does, so a retry of the same form resumes the session instead of being
rejected.

## Verification codes

- `POST /api/v1/auth/otp` issues a fresh code. Body: `{ type: "email", userDetail, template: "VERIFICATION", name }`.
- `POST /api/v1/users/verify-email` consumes it. Body: `{ email, otp }`.

Codes are four digits, cached in Redis under `OTP:<email>` with a 30 minute TTL.

## Delivery and timeouts

The verification email is handed to a pooled SMTP transport and sent in the background, so
the signup response does not wait on the mail server. The transport is module level with
`pool: true`, at most 2 connections, and hard connection, greeting and socket timeouts. This
matters on shared cPanel hosting, which throttles concurrent SMTP connections.

Mongo and Redis are both configured to fail fast rather than hang: an 8s server selection
budget and a capped pool on Mongo, and a disabled offline queue on Redis.

## Rate limits

Per IP, 15 minute window. `app.set("trust proxy", 1)` is required so the limiter sees the
real client address behind Apache or LiteSpeed.

| Route | Limit |
|---|---|
| `POST /users`, `POST /users/login`, `POST /users/verify-email`, `POST /users/verify-reset-code` | 20 |
| `POST /auth/otp`, `POST /users/forgot-password` | 5 |

## Local development

```
bun install
bun run dev
```

Requires `.env` with `MONGO_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`COMPANY_EMAIL`, `COMPANY_EMAIL_PASSWORD`, `FRONTEND_URL`, `PORT`.
