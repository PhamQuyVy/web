import { requireApiUser, secureJson } from "@/lib/security/api-security";
import { getPostgresPool, hasPostgresConfig } from "@/lib/db/postgres";
import { getDbPool, hasSqlServerConfig } from "@/lib/db/sql-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return secureJson(
      {
        success: false,
        message: "API kiểm tra database đã bị tắt ở production.",
      },
      { status: 404 },
    );
  }

  const auth = await requireApiUser();
  if (auth.response) {
    return auth.response;
  }

  if (!hasPostgresConfig() && !hasSqlServerConfig()) {
    return secureJson(
      {
        success: false,
        message: "Chưa cấu hình POSTGRES_URL hoặc SQL Server trong .env.local.",
      },
      { status: 500 },
    );
  }

  try {
    if (hasPostgresConfig()) {
      const result = await getPostgresPool().query(`
        SELECT
          current_database() AS database_name,
          now() AS server_time
      `);

      return secureJson({
        success: true,
        message: "Kết nối Supabase/PostgreSQL thành công",
        data: result.rows[0],
      });
    }

    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT
        DB_NAME() AS database_name,
        SYSDATETIME() AS server_time
    `);

    return secureJson({
      success: true,
      message: "Kết nối SQL Server thành công",
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return secureJson(
      {
        success: false,
        message: "Không thể kết nối database. Kiểm tra terminal server để xem chi tiết.",
      },
      { status: 500 },
    );
  }
}
