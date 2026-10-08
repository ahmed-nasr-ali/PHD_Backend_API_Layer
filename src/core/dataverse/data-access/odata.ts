/** Quotes a value as an OData string literal, escaping embedded single quotes. */
export const odataString = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;
