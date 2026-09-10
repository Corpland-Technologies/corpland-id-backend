# corpland-id-backend

Corpland ID: the identity service. Owns Corpland IDs, sessions, tokens and email verification for
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
| Corpland ID soft deleted | 409 | `{ message, code: "ACCOUNT_DELETED" }` |
| Corpland ID has no password (signs in with Google) | 400 | `{ message, code: "USE_GOOGLE_SIGN_IN", errors: { authProvider } }` |
| Corpland ID has no password and no Google link | 400 | `{ message, code: "PASSWORD_NOT_SET", errors: { authProvider } }` |
| Insert collided on an unexpected unique index | 400 | `{ message, code: "ACCOUNT_CREATE_FAILED", errors: { field } }` |
| Field validation failed | 400 | `{ success: false, errors: [ { msg, path, ... } ] }` |
| Rate limited | 429 | `{ message, code: "TOO_MANY_REQUESTS" }` |

`ACCOUNT_CREATE_FAILED` means the database is not the Corpland ID store. The service only
treats a duplicate key on `email` (or `googleId` for Google sign in) as a retry race; any other
unique index, such as the `userId` index in the Cubbicles database, is reported as this code
with the field name instead of being mislabelled as "email already in use".

`nextStep` is `"VERIFY_EMAIL"` while `emailVerified` is false, otherwise `"COMPLETE_PROFILE"`.
Clients should route on `nextStep`, and branch on `code` rather than on message text.

`otpSent` reports whether the verification code was handed to the mailer. The account is
created either way, so a client that sees `otpSent: false` should surface the resend
affordance rather than treat the signup as failed.

Matching on the password is deliberate. Knowing the password proves ownership exactly as
`POST /users/login` does, so a retry of the same form resumes the session instead of being
rejected.

## Sign in with Google

`POST /api/v1/users/google` verifies a Google credential, links or creates the account, and
issues the same access token, refresh cookie and Session row as `POST /users/login`.

Request, exactly one of

```json
{ "code": "<authorization code from the web popup flow>" }
{ "idToken": "<Google ID token from a native sign in>" }
```

Web sends `code` (Google Identity Services, popup, `redirect_uri` is `postmessage`, so the
secret never leaves the server). Mobile sends `idToken`. The token audience must match
`GOOGLE_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` or `GOOGLE_ANDROID_CLIENT_ID`.

Responses

| Condition | Status | Body |
|---|---|---|
| New email | 200 | `{ SUCCESS: true, message, data: { user, token, nextStep: "COMPLETE_PROFILE", otpSent: false, resumed: false, isNewUser: true } }` |
| Email already has a Corpland ID | 200 | same shape with `resumed: true`, `isNewUser: false` |
| Corpland ID soft deleted | 409 | `{ message, code: "ACCOUNT_DELETED" }` |
| Credential could not be verified | 400 | `{ message, code: "GOOGLE_AUTH_FAILED" }` |
| Insert collided on an unexpected unique index | 400 | `{ message, code: "ACCOUNT_CREATE_FAILED", errors: { field } }` |
| Google reports the email unverified | 400 | `{ message, code: "GOOGLE_EMAIL_UNVERIFIED" }` |
| Neither or both of `code` and `idToken` sent | 400 | `{ success: false, errors: [ { msg, path, ... } ] }` |
| Rate limited | 429 | `{ message, code: "TOO_MANY_REQUESTS" }` |

Linking rules, keyed on the lowercased email:

- A Corpland ID that already has this `googleId` signs in.
- A verified password Corpland ID is linked: `googleId` is set, the password is kept, and the
  profile image is only replaced when it is still the default placeholder.
- An unverified password Corpland ID is linked, marked `emailVerified: true`, and its password is
  removed. Whoever registered that email without proving ownership no longer has access. The
  Google owner can set a password later through forgot password.
- `phoneNumber`, `gender` and `dateOfBirth` are never provided by Google, so `nextStep` is
  always `"COMPLETE_PROFILE"`.

User documents gained `googleId` (unique, sparse), `authProvider` (the provider the account
was created with, `"local"` or `"google"`), `providers` (every provider the account has ever
signed in with), `lastSignInProvider` and `lastSignInAt`. Every signup, login, Google sign in
and password reset keeps them current. Existing documents read `providers` as `[]` until
`bun run backfill:providers` is run once against the Corpland ID database; it adds `"local"` to
every account with a password and `"google"` to every account with a `googleId`, and is safe to
repeat.

A Corpland ID without a password cannot use `POST /users` or `POST /users/login`. Both return
400 with `code: "USE_GOOGLE_SIGN_IN"` so the client can point the user at the Google button.
This is a 400 on purpose: the web client treats every 401 from this service as an expired
session and retries the refresh cookie instead of showing the body.

## Sending mail

Every email goes through `sendMailNotification(to, subject, params, TEMPLATE)` in `utils/email.js`.
It renders `templates/<TEMPLATE>.hbs` inside the shared brand layout (`templates/partials/`),
generates a plain text alternative, and sends as `Corpland <no-reply@corplandtechnologies.com>`
with `Reply-To: hello@corplandtechnologies.com`. The SMTP envelope sender stays `COMPANY_EMAIL`
so the mail server accepts the message. Override with `MAIL_FROM_NAME`, `NO_REPLY_EMAIL` and
`SUPPORT_EMAIL`. The no reply address must exist in cPanel (a mailbox or a forwarder) so
bounces are handled.

Templates and the params they expect:

| Template | Params | Sent by |
|---|---|---|
| `VERIFICATION` | `{ name, otp }` | signup and resend code |
| `RESET_PASSWORD` | `{ name, otp }` | forgot password |
| `ACCOUNT_DELETION` | `{ name }` | Corpland ID deletion request |
| `NOTIFICATION` | `{ name, headline, preheader, paragraphs, cta? }` (built from `{ subject, body, headline?, cta? }` by `notificationParams`) | `POST /users/email`, `POST /users/email/:id` |
| `ANNOUNCEMENT` | `{ name, subject, preheader, headline, paragraphs, cta?, signoff? }` | `POST /users/announcements` |
| `ADMIN_CREATION` | `{ name, rows: [{ label, value }], signInUrl }` | admin creation |

Every template declares inline `title`, `headline`, `preheader`, optional `footer`, and `content`
blocks; the layout provides the brand panel, the card and the footer. Partials `code`,
`button` and `details` are the only body building blocks. Templates are compiled once per
process, so restart after editing one.

## Announcements

`POST /api/v1/users/announcements` sends a product announcement on the `ANNOUNCEMENT` template
(Apple style: one headline, short paragraphs, one button). It requires the header
`x-internal-key: <INTERNAL_API_KEY>`; the marketplace backend sends it from its own
`INTERNAL_API_KEY`. Body:

```json
{
  "subject": "...", "preheader": "...", "headline": "...",
  "paragraphs": ["...", "..."],
  "cta": { "label": "...", "url": "https://..." },
  "signoff": "...",
  "audience": "verified" | "all",
  "to": "someone@example.com"
}
```

`userIds` (array of user ids) restricts the send to those accounts, which is how a run that hit
the SMTP daily cap is resumed: collect the ids from the `announcement failed for <id>` lines in
the server log and pass them back with `--ids-file`. `to` sends a single test copy and nothing else. Without `to`, the endpoint responds at once
with `{ queued }` and delivers in the background through the pooled SMTP transport (about 3
mails a second). `audience` defaults to `verified` (active accounts that finished email
verification); `all` includes accounts that never verified. The sender script lives in
corpland-backend at `scripts/temp/sendAllEmailNotification.js` (`bun run pushAllEmail`).

The older `POST /users/email` and `POST /users/email/:id` endpoints have no authentication.
They should move behind `requireInternalKey` as soon as the marketplace backend ships the header.

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

Google sign in needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the Google Cloud Web
OAuth client. `GOOGLE_IOS_CLIENT_ID` and `GOOGLE_ANDROID_CLIENT_ID` are optional and only
widen the accepted token audience for the mobile app. Without `GOOGLE_CLIENT_ID` the endpoint
answers 400 `GOOGLE_AUTH_FAILED` for every request.
