// Format the stored decimal string without a lossy conversion to Number.
export function brl(value: string) {
  const [integer, cents = "00"] = value.split(".");
  return `R$ ${BigInt(integer).toLocaleString("pt-BR")},${cents.padEnd(2, "0")}`;
}
export function date(value: string) {
  return value.split("-").reverse().join("/");
}
export function timestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

/** Short, readable reference of an order: the first 8 characters of its id. */
export const orderRef = (id: string) => id.slice(0, 8);

/** An account's profile as users read it. */
export const roleLabel = (role: "ADMIN" | "USER") => (role === "ADMIN" ? "Administrador" : "Usuário");

/** Singular when `count` is exactly one, plural otherwise. */
export const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
