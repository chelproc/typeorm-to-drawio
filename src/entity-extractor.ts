import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { ParseResult } from "@babel/parser";
import type {
  EntityInfo,
  EntityField,
  ParsedEntities,
  Relationship,
} from "./types.ts";

/**
 * Extract entities and relationships from AST
 */
export function extractEntities(
  filePath: string,
  ast: ParseResult<any>,
): ParsedEntities {
  const entities = new Map<string, EntityInfo>();
  const relationships: Relationship[] = [];

  traverse.default(ast, {
    ClassDeclaration(path) {
      const node = path.node;

      // Check if class has @Entity decorator
      const hasEntityDecorator = node.decorators?.some((decorator) => {
        if (t.isCallExpression(decorator.expression)) {
          return (
            t.isIdentifier(decorator.expression.callee) &&
            decorator.expression.callee.name === "Entity"
          );
        }
        return (
          t.isIdentifier(decorator.expression) &&
          decorator.expression.name === "Entity"
        );
      });

      if (!hasEntityDecorator) return;

      const entityName = node.id?.name;
      if (!entityName) return;

      const fields: EntityField[] = [];
      const relationFields = new Set<string>(); // Track xxx fields to skip xxxId duplicates

      // First pass: collect all relation fields
      node.body.body.forEach((member) => {
        if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
          const fieldName = member.key.name;
          const decorators = member.decorators || [];

          decorators.forEach((decorator) => {
            let decoratorName: string | undefined;

            if (t.isCallExpression(decorator.expression)) {
              if (t.isIdentifier(decorator.expression.callee)) {
                decoratorName = decorator.expression.callee.name;
              }
            } else if (t.isIdentifier(decorator.expression)) {
              decoratorName = decorator.expression.name;
            }

            if (
              decoratorName &&
              ["ManyToOne", "OneToMany", "OneToOne", "ManyToMany"].includes(
                decoratorName,
              )
            ) {
              relationFields.add(fieldName);

              // Extract target entity from the decorator
              if (
                t.isCallExpression(decorator.expression) &&
                decorator.expression.arguments.length > 0
              ) {
                const firstArg = decorator.expression.arguments[0];
                let targetEntity: string | undefined;

                // Handle arrow function: () => TargetEntity
                if (
                  t.isArrowFunctionExpression(firstArg) &&
                  t.isIdentifier(firstArg.body)
                ) {
                  targetEntity = firstArg.body.name;
                }

                if (targetEntity) {
                  relationships.push({
                    from: entityName,
                    to: targetEntity,
                    fromField: fieldName,
                    type: decoratorName as any,
                  });
                }
              }
            }
          });
        }
      });

      // Second pass: collect fields, skipping xxxId if xxx exists
      node.body.body.forEach((member) => {
        if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
          const fieldName = member.key.name;
          const decorators = member.decorators || [];

          // Skip xxxId field if xxx relation field exists
          if (fieldName.endsWith("Id")) {
            const baseFieldName = fieldName.slice(0, -2);
            if (relationFields.has(baseFieldName)) {
              return; // Skip this field
            }
          }

          let fieldType = "unknown";
          let isPrimary = false;
          let isNullable = false;
          let isRelation = false;
          let relationType: EntityField["relationType"];

          // Extract type from TypeScript annotations
          if (
            member.typeAnnotation &&
            t.isTSTypeAnnotation(member.typeAnnotation)
          ) {
            fieldType = extractTypeString(member.typeAnnotation.typeAnnotation);
          }

          // Check decorators
          decorators.forEach((decorator) => {
            let decoratorName: string | undefined;
            let decoratorArgs: any[] = [];

            if (t.isCallExpression(decorator.expression)) {
              if (t.isIdentifier(decorator.expression.callee)) {
                decoratorName = decorator.expression.callee.name;
                decoratorArgs = decorator.expression.arguments;
              }
            } else if (t.isIdentifier(decorator.expression)) {
              decoratorName = decorator.expression.name;
            }

            if (!decoratorName) return;

            switch (decoratorName) {
              case "PrimaryGeneratedColumn":
              case "PrimaryColumn":
                isPrimary = true;
                if (!fieldType || fieldType === "unknown") {
                  fieldType =
                    decoratorArgs.length > 0 &&
                    t.isStringLiteral(decoratorArgs[0])
                      ? decoratorArgs[0].value
                      : "uuid";
                }
                break;

              case "Column":
                // Extract column type from decorator arguments
                if (decoratorArgs.length > 0) {
                  const firstArg = decoratorArgs[0];
                  if (t.isStringLiteral(firstArg)) {
                    fieldType = firstArg.value;
                  } else if (t.isObjectExpression(firstArg)) {
                    firstArg.properties.forEach((prop) => {
                      if (
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key) &&
                        prop.key.name === "nullable" &&
                        t.isBooleanLiteral(prop.value)
                      ) {
                        isNullable = prop.value.value;
                      }
                      if (
                        t.isObjectProperty(prop) &&
                        t.isIdentifier(prop.key) &&
                        prop.key.name === "type" &&
                        t.isStringLiteral(prop.value)
                      ) {
                        fieldType = prop.value.value;
                      }
                    });
                  }
                }
                break;

              case "ManyToOne":
              case "OneToMany":
              case "OneToOne":
              case "ManyToMany":
                isRelation = true;
                relationType = decoratorName as any;
                break;

              case "CreateDateColumn":
              case "UpdateDateColumn":
                if (fieldType === "unknown") {
                  fieldType = "Date";
                }
                break;
            }
          });

          fields.push({
            name: fieldName,
            type: fieldType,
            isPrimary,
            isNullable,
            isRelation,
            relationType,
          });
        }
      });

      entities.set(entityName, {
        name: entityName,
        fields,
        filePath,
      });
    },
  });

  return { entities, relationships };
}

/**
 * Extract type string from TypeScript type annotation
 */
function extractTypeString(typeNode: t.TSType): string {
  if (t.isTSStringKeyword(typeNode)) return "string";
  if (t.isTSNumberKeyword(typeNode)) return "number";
  if (t.isTSBooleanKeyword(typeNode)) return "boolean";
  if (t.isTSAnyKeyword(typeNode)) return "any";
  if (t.isTSUnknownKeyword(typeNode)) return "unknown";
  if (t.isTSVoidKeyword(typeNode)) return "void";
  if (t.isTSNullKeyword(typeNode)) return "null";
  if (t.isTSUndefinedKeyword(typeNode)) return "undefined";

  if (t.isTSTypeReference(typeNode) && t.isIdentifier(typeNode.typeName)) {
    return typeNode.typeName.name;
  }

  if (t.isTSUnionType(typeNode)) {
    const types = typeNode.types.map(extractTypeString);
    return types.join(" | ");
  }

  if (t.isTSArrayType(typeNode)) {
    return `${extractTypeString(typeNode.elementType)}[]`;
  }

  return "unknown";
}

/**
 * Merge entities and relationships from multiple files
 */
export function mergeEntities(parsedResults: ParsedEntities[]): ParsedEntities {
  const mergedEntities = new Map<string, EntityInfo>();
  const mergedRelationships: Relationship[] = [];

  for (const result of parsedResults) {
    result.entities.forEach((entity, name) => {
      mergedEntities.set(name, entity);
    });
    mergedRelationships.push(...result.relationships);
  }

  return {
    entities: mergedEntities,
    relationships: mergedRelationships,
  };
}
