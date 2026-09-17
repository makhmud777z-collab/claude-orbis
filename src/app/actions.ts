"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/** Демо-переключатели: в бою их место занимают вход и выбор рабочего пространства. */

export async function switchUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const store = await cookies();
  store.set("orbis_user", userId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}

export async function switchLocale(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const store = await cookies();
  store.set("orbis_locale", locale === "uz" ? "uz" : "ru", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function switchTenant(formData: FormData) {
  const slug = String(formData.get("tenant") ?? "");
  const store = await cookies();
  store.set("orbis_tenant", slug, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  store.delete("orbis_user");
  store.delete("orbis_locale");
  revalidatePath("/", "layout");
}
