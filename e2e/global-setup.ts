import { reiniciarBanco } from "./banco";

/** Roda uma vez antes de tudo: confirma que o Postgres responde e deixa o seed no lugar. */
export default function globalSetup(): void {
  reiniciarBanco();
}
