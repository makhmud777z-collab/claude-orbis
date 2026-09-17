import { redirect } from "next/navigation";

/** Настройки переехали в закрытое «Администрирование» — старая ссылка ведёт туда же. */
export default function LegacySettingsRoute() {
  redirect("/admin/pipelines");
}
