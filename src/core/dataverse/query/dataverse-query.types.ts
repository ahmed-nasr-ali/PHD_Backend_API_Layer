export interface DataverseExpand {
  /** Navigation property name (case-sensitive). */
  property: string;
  select?: string[];
  expand?: DataverseExpand[];
}

export interface DataverseQuery {
  select?: string[];
  filter?: string;
  orderBy?: string[];
  top?: number;
  expand?: DataverseExpand[];
}
