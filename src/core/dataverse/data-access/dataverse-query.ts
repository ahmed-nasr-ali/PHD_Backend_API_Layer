export interface DataverseQuery {
  select?: string[];
  filter?: string;
  orderBy?: string[];
  top?: number;
}
