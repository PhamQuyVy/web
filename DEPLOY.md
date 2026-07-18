# Deploy: Vercel Free + Supabase Free

## 1. Tao Supabase database

1. Tao project moi tren Supabase.
2. Vao SQL Editor.
3. Copy toan bo noi dung `scripts/supabase-schema.sql`.
4. Bam Run.

## 2. Lay connection string

Trong Supabase:

1. Vao Project Settings.
2. Vao Database.
3. Lay connection string dang pooled/transaction pooler neu co.
4. Gan vao bien moi truong `POSTGRES_URL`.

## 3. Deploy Vercel

1. Day project len GitHub.
2. Vao Vercel, import repo.
3. Them Environment Variables:

```env
NEXT_PUBLIC_APP_URL=https://ten-web-cua-ban.vercel.app
POSTGRES_URL=postgresql://...
POSTGRES_SSL=true

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

APP_ENCRYPTION_KEY=...
INTERNAL_API_KEY=...
SPEECH_API_KEY=
SPEECH_API_REGION=
```

4. Deploy.

## 4. Cap nhat OAuth callback

Google OAuth redirect URI:

```txt
https://ten-web-cua-ban.vercel.app/api/auth/google/callback
```

Facebook OAuth redirect URI:

```txt
https://ten-web-cua-ban.vercel.app/api/auth/facebook/callback
```

## 5. Test production

1. Vao link Vercel.
2. Dang ky tai khoan email.
3. Dang nhap Gmail neu da cau hinh Google OAuth.
4. Vao Supabase table editor kiem tra:

```sql
select email, full_name, provider, phone_encrypted, address_encrypted, created_at
from users
order by created_at desc;
```

`phone_encrypted` va `address_encrypted` phai co dang `enc:v1:...`.
