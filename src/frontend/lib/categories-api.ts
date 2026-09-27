import { authFetch } from "@/lib/auth-fetch";

export type CategoryItem = {
  id: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  isArchived: boolean;
};

export async function getCategories() {
  const response = await authFetch("/api/v1/categories");
  if (!response.ok) return [];
  return (await response.json()) as CategoryItem[];
}

export async function createCategory(name: string) {
  const response = await authFetch("/api/v1/categories", {
    method: "POST",
    body: JSON.stringify({ name, sortOrder: 0, isSystem: false }),
  });
  if (!response.ok) throw new Error("Nie udało się utworzyć kategorii.");
  return (await response.json()) as CategoryItem;
}
