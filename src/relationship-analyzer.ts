import type { ParsedEntities, Relationship } from "./types.ts";

/**
 * Analyze and enrich relationships between entities
 */
export function analyzeRelationships(
  parsedEntities: ParsedEntities,
): Relationship[] {
  const { relationships } = parsedEntities;
  const enrichedRelationships: Relationship[] = [];
  const processedPairs = new Set<string>();

  relationships.forEach((rel) => {
    const pairKey = `${rel.from}-${rel.to}-${rel.fromField}`;
    if (processedPairs.has(pairKey)) return;
    processedPairs.add(pairKey);

    // Find corresponding reverse relationship
    const reverseRel = relationships.find(
      (r) =>
        r.to === rel.from &&
        r.from === rel.to &&
        r.type === getInverseRelationType(rel.type),
    );

    if (reverseRel) {
      // Mark as processed to avoid duplicate
      const reversePairKey = `${reverseRel.from}-${reverseRel.to}-${reverseRel.fromField}`;
      processedPairs.add(reversePairKey);

      // Create bidirectional relationship
      enrichedRelationships.push({
        ...rel,
        toField: reverseRel.fromField,
      });
    } else {
      // Unidirectional relationship
      enrichedRelationships.push(rel);
    }
  });

  return enrichedRelationships;
}

/**
 * Get the inverse relationship type
 */
function getInverseRelationType(
  type: Relationship["type"],
): Relationship["type"] | null {
  switch (type) {
    case "ManyToOne":
      return "OneToMany";
    case "OneToMany":
      return "ManyToOne";
    case "OneToOne":
      return "OneToOne";
    case "ManyToMany":
      return "ManyToMany";
    default:
      return null;
  }
}

/**
 * Get draw.io arrow style for relationship type
 */
export function getArrowStyle(type: Relationship["type"]): {
  startArrow: string;
  endArrow: string;
} {
  switch (type) {
    case "ManyToOne":
      return { startArrow: "ERmany", endArrow: "ERone" };
    case "OneToMany":
      return { startArrow: "ERone", endArrow: "ERmany" };
    case "OneToOne":
      return { startArrow: "ERone", endArrow: "ERone" };
    case "ManyToMany":
      return { startArrow: "ERmany", endArrow: "ERmany" };
    default:
      return { startArrow: "none", endArrow: "none" };
  }
}
