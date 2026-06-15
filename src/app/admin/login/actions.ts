"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.set({
    name: ADMIN_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  redirect("/admin/login");
}
