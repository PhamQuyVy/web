import Link from "next/link";

export const metadata = { title: "Quyền riêng tư" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-slate-900">
      <h1 className="text-3xl font-bold">Quyền riêng tư</h1>
      <div className="mt-6 space-y-4 leading-7 text-slate-700">
        <p>Trang học lưu thông tin tài khoản, phiên đăng nhập và tiến độ để cung cấp chức năng học tập.</p>
        <p>Mật khẩu được băm bằng Argon2id. Số điện thoại và địa chỉ được mã hóa AES-256-GCM trước khi lưu.</p>
        <p>Đăng nhập Google hoặc Facebook không làm trang học nhận hay lưu mật khẩu của nhà cung cấp.</p>
        <p>Dữ liệu không được bán. Nhật ký kỹ thuật chỉ được dùng để bảo mật, chẩn đoán lỗi và thống kê đăng nhập.</p>
      </div>
      <Link className="mt-8 inline-block font-semibold text-orange-700" href="/intro">Về trang giới thiệu</Link>
    </main>
  );
}
