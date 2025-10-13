/**
 * TypeORM Entity and Draw.io type definitions
 */

export interface EntityField {
  name: string;
  type: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  isRelation?: boolean;
  relationType?: "ManyToOne" | "OneToMany" | "OneToOne" | "ManyToMany";
  relationTarget?: string;
}

export interface EntityInfo {
  name: string;
  fields: EntityField[];
  filePath: string;
}

export interface Relationship {
  from: string;
  to: string;
  fromField: string;
  toField?: string;
  type: "ManyToOne" | "OneToMany" | "OneToOne" | "ManyToMany";
}

export interface ParsedEntities {
  entities: Map<string, EntityInfo>;
  relationships: Relationship[];
}

export interface CLIOptions {
  output?: string;
  verbose?: boolean;
  help?: boolean;
}
