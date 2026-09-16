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

export async function switchTenant(formData: FormData) {
  const slug = String(formData.get("tenant") ?? "");
  const store = await cookies();
  store.set("orbis_tenant", slug, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  store.delete("orbis_user");
  revalidatePath("/", "layout");
}
