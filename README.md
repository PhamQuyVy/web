# 汉语学堂

Ứng dụng học tiếng Trung bằng Next.js 16, PostgreSQL/Supabase và OAuth Google/Facebook.

## Chạy cục bộ

1. Sao chép `.env.example` thành `.env.local` và điền biến môi trường.
2. Chạy schema PostgreSQL bằng `npm run db:migrate-postgres`.
3. Chạy `npm run dev`, sau đó mở `http://localhost:3000`.

## Kiểm tra

```bash
npm run lint
npm run test
npm run build
```

## Bảo mật dữ liệu

- Mật khẩu email được băm bằng Argon2id; mật khẩu cũ được nâng cấp sau lần đăng nhập hợp lệ.
- Google/Facebook không lưu mật khẩu nhà cung cấp.
- Session token chỉ nằm trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`; cơ sở dữ liệu chỉ lưu SHA-256 của token.
- Số điện thoại, địa chỉ và OAuth refresh token được mã hóa AES-256-GCM.
- PostgreSQL là kho dữ liệu runtime duy nhất trong production. JSON runtime chỉ dành cho local development và bị Git bỏ qua.
- Các action nhạy cảm dùng rate limit phân tán trong PostgreSQL; Proxy bổ sung kiểm tra origin, kích thước, method và giới hạn biên.
- Các bảng tài khoản, phiên, tiến độ, đăng nhập, OAuth identity và rate limit bật và ép buộc RLS.

Không đặt secret trong biến bắt đầu bằng `NEXT_PUBLIC_`. Sau khi thay biến môi trường trên Vercel, cần redeploy production.

## Supabase

Production nên dùng TLS xác minh chứng chỉ:

```env
POSTGRES_SSL=true
POSTGRES_REJECT_UNAUTHORIZED=true
POSTGRES_CA_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
```

Chạy `scripts/supabase-security-check.sql` trong Supabase SQL Editor để kiểm tra RLS, quyền bảng và trạng thái mã hóa mà không hiển thị email thô.

## Triển khai

Vercel tự triển khai nhánh `master`. Cấu hình ít nhất:

- `NEXT_PUBLIC_APP_URL`
- `POSTGRES_URL`
- `POSTGRES_SSL`
- `POSTGRES_REJECT_UNAUTHORIZED`
- `POSTGRES_CA_CERT`
- `APP_ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ALLOWED_ORIGINS`

Authorized redirect URI của Google phải là `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
