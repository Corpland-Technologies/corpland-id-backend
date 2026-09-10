# corpland-id-backend — Architecture

Corpland ID, the identity service. Express 4 + Mongoose 8 + Redis (ioredis), CommonJS, no TypeScript, no build step, no tests. Package name in `package.json` is `corpland-backend`; the GitHub remote is `corplandtechnologies/corpland-accounts`. Base path for every route: `/api/v1`.

## 1. Bootstrap
- `index.js` requires `core/server` and calls `startServer()`.
- `core/server.js` `startServer()`: `application()` builds the middleware stack, `connectToDatabase()` (fire and forget, errors only logged), Redis `connect`/`error` listeners (client constructed at import in `utils/redis.js`), `app.listen(config.PORT || 5007)`, `unhandledRejection` logs, `uncaughtException` logs and exits.
- `dotenv.config()` runs in both `core/server.js` and `core/config.js`.

### Middleware order (`core/app.js`)
1. `app.set("trust proxy", 1)` (needed for the IP rate limiter behind Apache/LiteSpeed)
2. `bodyParser.json()`, `express.json()` (duplicate), `express.urlencoded({ extended: false })`
3. `helmet()` defaults, `compression()`
4. `cors({ origin: [config.FRONTEND_URL, config.PAYSTACK_CALLBACK_URL, "http://localhost:3000"], credentials: true })` — credentials are required because the refresh token is an httpOnly cookie
5. `emailValidation` (`core/emailCheck.js`): lowercases and trims every `req.body` key whose name contains `email`
6. `cookieParser()`
7. `GET /` health check
8. `routes(app)`
9. `handleApplicationErrors`, then `notFound` (replies 400, not 404)

### Rate limiting (`core/rateLimit.js`)
`express-rate-limit`, per IP, 15 minute window. `credentialLimiter` limit 20, `otpLimiter` limit 5. Both reply `429 { message, code: "TOO_MANY_REQUESTS" }`. Applied on `POST /users`, `/users/login`, `/users/verify-email`, `/users/verify-reset-code` (credential) and `/users/forgot-password`, `/auth/otp` (otp). `POST /users/reset-password` and every session route are unlimited.

### Route mounting (`core/routes.js`)
```
/api/v1/admin    -> files/admin/admin.routes.js
/api/v1/auth     -> files/auth/auth.route.js
/api/v1/users    -> files/user/user.routes.js
/api/v1/session  -> files/session/session.routes.js
```
`files/device/device.routes.js` exists but is not mounted.

### Database (`core/db.js`)
Mongoose 8, `strictQuery` false. Connection promise memoised on `global.__mongooseConnection`. Fail fast options: `serverSelectionTimeoutMS 8000`, `connectTimeoutMS 8000`, `socketTimeoutMS 20000`, `maxPoolSize 10`, `maxIdleTimeMS 60000`. The Corpland ID database is `corpland-accounts` (collections `users`, `sessions`, `admin`, `payments`), separate from the marketplace DB `corpland` on the same Atlas cluster. Do not point `MONGO_URL` at `corpland-cubbicles`: that is the Cubbicles app database, and its `users` collection carries a unique non sparse `userId` index that makes every Corpland ID insert collide on `userId: null`. The service reports that case as `ACCOUNT_CREATE_FAILED`.

### Redis (`utils/redis.js`)
ioredis client at module load. `HEROKU_PROD` branch parses `REDIS_URL` with TLS; otherwise `new Redis(REDIS_URL)`. `enableOfflineQueue false`, `connectTimeout 5000`, `commandTimeout 5000`, `maxRetriesPerRequest 1`. `RedisClient.setCache({key,value,expiry=1800})`, `getCache`, `deleteCache`. Two key kinds: `OTP:<email|phone>` (30 min) and the access token blacklist (key is the raw JWT, written on logout, read by `isAuthenticated`). The blacklist TTL passes milliseconds into `EX` seconds, so entries live ~1000x longer than intended.

### Cron (`utils/cron.js`)
`keepServerAlive()` is imported in `core/server.js` but never invoked. No running cron jobs.

## 2. Folder layout
```
index.js       entrypoint
core/          bootstrap and cross cutting infra: app, server, config (only place process.env is read), db, routes, response, rateLimit, emailCheck, generalMessages
constants/     PAGE_LENGTH, LIMIT, SKIP, SORT, DUPLICATE_KEY_CODE, signUpCodes, signUpSteps; statusCode.js
files/         THE ENTITY LAYER: admin/ auth/ device/ session/ user/
providers/     only paystack/, broken and never imported (dead)
templates/     handlebars email bodies (.hbs)
utils/         shared helpers and every real third party client (email, sms, redis, firebase, multer, cron, axios.provision, errors)
validations/   express-validator checkSchema definitions + validate.js runner
```

## 3. Entity pattern in `files/`
`files/<entity>/<entity>.<layer>.js`, six file shape: `model`, `repository`, `service`, `controller`, `routes`, `messages`.
Flow: `route -> [rate limiter] -> [validate] -> [isAuthenticated] -> controller -> service -> repository -> model`.

| Entity | Mounted | Notes |
|---|---|---|
| user | `/api/v1/users` | core entity |
| session | `/api/v1/session` | refresh tokens |
| admin | `/api/v1/admin` | admin login is broken (`tokenHandler` called as a function) |
| auth | `/api/v1/auth` | no model or repository; stateless OTP and logout; controller nested in `controller/sendOtp.controller.js`; four `*ResetPassword` routes point at missing service methods |
| device | not mounted | FCM tokens, unreachable |

Conventions:
- model: bare `mongoose.Schema` + `mongoose.model(Name, schema, collection)`, exported as `{ Name }`. No hooks, methods, statics.
- repository: class of static `find/findOne/findOneAndUpdate` wrappers spreading a payload object. Soft delete is `isDelete: false` in the repository query.
- service: class of static methods that return `{ SUCCESS, message, data? }` (user, admin) or `{ success, message, data? }` (auth, session, device). `UserService` also throws `DuplicateError` for 409 signup cases.
- controller: `const [error, data] = await manageAsyncOps(Service.x()); if (error) return next(error); if (!data.SUCCESS) return next(new CustomError(data.message, 400, data)); return responseHandler(res, SUCCESS, data);`
- routes: public routes first, then `router.use(isAuthenticated)` divider, then protected routes.
- messages: object of user facing strings.

## 4. Models
### User (`files/user/user.model.js`, collection `users`)
`name`, `email` (unique, trim, lowercase), `phoneNumber`, `password` (not required, not select false), `image` (default Cloudinary placeholder), `gender` (enum), `dateOfBirth`, `isVerified` (unused), `emailVerified`, `termsAndConditions`, `googleId` (unique, sparse), `authProvider` (provider the account was created with), `providers` (every provider used, kept by `UserService.recordSignIn`), `lastSignInProvider`, `lastSignInAt`, `isDelete`, timestamps. `scripts/backfillAuthProviders.js` fills `providers` for pre existing accounts. No field is required at schema level; signup validation enforces name, email, password. Password hashing is manual in the service via `hashPassword`, and every read path blanks `password` by hand.
### Session (`files/session/session.model.js`)
`token` (raw refresh JWT), `userId` ref User, `createdAt`, `expiresAt` (7d, no TTL index), `isDelete`.
### Admin, Device: see files.

## 5. Tokens and auth middleware
- `utils/index.js` `tokenHandler.access(payload)` = 15m JWT with `JWT_ACCESS_SECRET`; `tokenHandler.refreshToken(payload)` = 7d JWT with `JWT_REFRESH_SECRET`. Payload `{ name, email, _id }`.
- Access token goes in the response body as `data.token`; clients send `Authorization: Bearer`. Refresh token is an httpOnly cookie `refreshToken` (`maxAge` 10 years, `secure` in production, `sameSite: "Strict"`) and a `Session` row. `UserService.establishSession(user, res)` does all of this.
- `isAuthenticated` (`utils/index.js`): bearer token, Redis blacklist check, `jwt.verify` with `JWT_ACCESS_SECRET`, sets `req.payload` and `res.locals.jwt`. 401 on failure.
- The same `JWT_ACCESS_SECRET` value is shared with corpland-backend, which verifies tokens locally. Logout blacklists only in this service's Redis, so marketplace tokens live until natural expiry.

## 6. Flows (route -> controller -> service)
- Register `POST /users`: `userSignUpController` -> `userSignUpService`. Idempotent: existing unverified account resumes (`resumeSignUpService`), soft deleted returns 409 `ACCOUNT_DELETED`, verified returns 409 `EMAIL_IN_USE`. Issues OTP via `AuthService.issueOtp`, then `establishSession`. Response `{ SUCCESS, message, data: { user, token, nextStep, otpSent, resumed } }`.
- Login `POST /users/login`: `userLogin` -> `userLoginService`, bcrypt compare, `establishSession`. 401 on failure. `emailVerified` is not checked at login.
- Verify email `POST /users/verify-email` `{ email, otp }`, resend `POST /auth/otp`, forgot `POST /users/forgot-password`, verify reset code `POST /users/verify-reset-code`, reset `POST /users/reset-password` `{ email, newPassword }` (does not re-check the OTP).
- Refresh `GET /session/auth/refresh-token` reads the cookie, returns `{ success, message, token }` at top level.
- Logout `POST /session/logout` (authed; blacklists, clears cookie, soft deletes Session). `POST /auth/logout` also exists (blacklist only).
- Me `GET /users/me`.

## 7. utils
`utils/index.js`: `tokenHandler`, `isAuthenticated`, `verifyToken`, `hashPassword` (bcryptjs), `verifyPassword`, `manageAsyncOps` ([error, data] tuple), `queryConstructor`, `fileModifier`, `AlphaNumeric`, `adminVerifier`, `sanitizePhoneNumber`, `verifyPhoneNumber`, `dateCheck`, `verifyWhoAmI`.
`utils/errors.js`: `CustomError` (400 default), `DuplicateError` (409). Constructor `(message, statusCode, errors, code)`.
`utils/internalKey.js`: `requireInternalKey` middleware, constant time check of `x-internal-key` against `INTERNAL_API_KEY`; guards `POST /users/announcements`.
`utils/email.js`: nodemailer SMTP (`mail.corplandtechnologies.com:465`, pooled) + handlebars templates cached in a Map, partials in `templates/partials/` registered once (`layout`, `code`, `button`, `details`), `firstName` helper, plain text alternative, From `Corpland <NO_REPLY_EMAIL>`, Reply-To `SUPPORT_EMAIL`, envelope sender `COMPANY_EMAIL`. `sendMailNotification(to, subject, params, TemplateName)` and `renderTemplate(name, params)`.
`utils/sms.js`: Termii via axios (Twilio commented out).
`utils/firebase.js`: firebase-admin FCM only, not imported anywhere, init passes `credentials` instead of `credential`. Service account JSON is committed in `utils/`.

## 8. Responses and errors
`responseHandler(res, 200, data)`; every success is HTTP 200. Error middleware renders `CustomError`/`DuplicateError` as `{ message, code?, errors? }` at their status; everything else is flattened to 400 `{ message }`. Reachable codes: 200, 400, 401, 409, 429.

## 9. Validation
`validations/validate.js` `validate(validations)` runs chains and replies `400 { success: false, errors }`. Only `POST /users` (`createUser`: name, email, password notEmpty) and `POST /admin` validate.

## 10. Environment variable names
`PORT`, `MONGO_URL`, `REDIS_URL`, `ENV`, `BASE_URL`, `TERMII_BASE_URL`, `TERMII_KEY`, `CLOUDINARY_*`, `PAYSTACK_BASE_URL`, `PAYSTACK_SK_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `PAYSTACK_CALLBACK_URL`, `TOKEN_EXPIRE_IN` (unused), `COMPANY_EMAIL`, `COMPANY_EMAIL_PASSWORD`. `NODE_ENV` is read raw in `user.service.js`.

## 11. Tooling
`yarn` declared, `bun.lock` committed, README says bun. Husky has no hooks. lint-staged and prettier are installed but unconfigured. No tests, no CI.

## 12. Known issues
- `POST /users/reset-password` never re-verifies the OTP and logs the plaintext password.
- `PUT /users/:id/update` sits above the auth divider and spreads `req.body` into `$set`.
- `PUT /users/password` trusts `body.id` instead of the JWT.
- `getLoggedInUser` dereferences the user before the null check.
- Firebase service account key committed to the repo.
