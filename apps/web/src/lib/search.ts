/** Lowercased and without accents, so "joao" finds "João". */
const searchKey = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");

/** Whether `text` contains the typed `query`, ignoring case, accents and surrounding spaces. */
export const matchesSearch = (text: string, query: string) => searchKey(text).includes(searchKey(query.trim()));
