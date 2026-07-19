import Link from "next/link";

export const metadata = { title: "Điều khoản sử dụng" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-slate-900">
      <h1 className="text-3xl font-bold">Điều khoản sử dụng</h1>
      <div className="mt-6 space-y-4 leading-7 text-slate-700">
        <p>Nội dung trên trang phục vụ mục đích tự học và luyện tập tiếng Trung.</p>
        <p>Người dùng chịu trách nhiệm bảo vệ thông tin đăng nhập và không được lạm dụng hệ thống hay dữ liệu của người khác.</p>
        <p>Kết quả nhận diện giọng nói và chấm chữ là công cụ hỗ trợ luyện tập, không phải chứng nhận chuyên môn.</p>
      </div>
      <Link className="mt-8 inline-block font-semibold text-orange-700" href="/intro">Về trang giới thiệu</Link>
    </main>
  );
}
