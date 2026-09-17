"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  NO_STUDENT,
  parseShortlist,
  SHORTLIST_COOKIE,
  toggle,
  type ShortlistMap,
} from "@/lib/shortlist";

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

/** Шорт-лист вузов: добавить или убрать вуз для выбранного студента. */
export async function toggleShortlist(formData: FormData) {
  const universityId = String(formData.get("universityId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!universityId) return;

  const store = await cookies();
  const map: ShortlistMap = parseShortlist(store.get(SHORTLIST_COOKIE)?.value);
  store.set(SHORTLIST_COOKIE, JSON.stringify(toggle(map, studentId, universityId)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  revalidatePath("/universities");
  revalidatePath("/universities/compare");
}

export async function clearShortlist(formData: FormData) {
  const studentId = String(formData.get("studentId") || NO_STUDENT);
  const store = await cookies();
  const map: ShortlistMap = parseShortlist(store.get(SHORTLIST_COOKIE)?.value);
  delete map[studentId];
  store.set(SHORTLIST_COOKIE, JSON.stringify(map), {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  revalidatePath("/universities");
  revalidatePath("/universities/compare");
}
