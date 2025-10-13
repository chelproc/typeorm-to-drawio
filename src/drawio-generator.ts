import { create } from "xmlbuilder2";
import type { ParsedEntities, Relationship, EntityField } from "./types.ts";
import { getArrowStyle } from "./relationship-analyzer.ts";

const ENTITY_WIDTH = 140;
const FIELD_HEIGHT = 30;
const HEADER_HEIGHT = 30;
const GRID_SPACING_X = 200;
const GRID_SPACING_Y = 250;
const COLUMNS_PER_ROW = 3;

/**
 * Generate Draw.io XML from parsed entities
 */
export function generateDrawioXML(
  parsedEntities: ParsedEntities,
  relationships: Relationship[],
): string {
  const { entities } = parsedEntities;
  const entityPositions = new Map<
    string,
    { x: number; y: number; height: number }
  >();

  // Calculate positions for entities in a grid layout
  let index = 0;
  entities.forEach((entity, name) => {
    const col = index % COLUMNS_PER_ROW;
    const row = Math.floor(index / COLUMNS_PER_ROW);
    const x = 120 + col * (ENTITY_WIDTH + GRID_SPACING_X);
    const y = 80 + row * GRID_SPACING_Y;
    const height = HEADER_HEIGHT + entity.fields.length * FIELD_HEIGHT;

    entityPositions.set(name, { x, y, height });
    index++;
  });

  // Create XML document
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("mxfile")
    .ele("diagram")
    .ele("mxGraphModel")
    .ele("root");

  // Add page and layer cells
  doc.ele("mxCell", { id: "page" });
  doc.ele("mxCell", { id: "layer", parent: "page" });

  // Track entity IDs for relationships
  let entityCounter = 1;
  const entityIdMap = new Map<string, string>();

  // Add entities and their fields
  entities.forEach((entity) => {
    const pos = entityPositions.get(entity.name)!;
    const entityId = `E${entityCounter}`;
    entityIdMap.set(entity.name, entityId);
    entityCounter++;

    // Add entity swimlane
    const entityCell = doc.ele("mxCell", {
      id: entityId,
      value: entity.name,
      style: [
        "swimlane",
        "childLayout=stackLayout",
        "horizontal=1",
        `startSize=${HEADER_HEIGHT}`,
        "horizontalStack=0",
        "resizeParent=1",
        "resizeParentMax=0",
        "resizeLast=0",
        "whiteSpace=wrap",
        "html=1",
      ].join(";"),
      vertex: "1",
      parent: "layer",
    });

    entityCell.ele("mxGeometry", {
      x: pos.x.toString(),
      y: pos.y.toString(),
      width: ENTITY_WIDTH.toString(),
      height: pos.height.toString(),
      as: "geometry",
    });

    // Add fields
    entity.fields.forEach((field, fieldIndex) => {
      const fieldId = `${entityId}F${fieldIndex + 1}`;
      const fieldValue = formatFieldValue(field);

      const fieldCell = doc.ele("mxCell", {
        id: fieldId,
        value: fieldValue,
        style: [
          "text",
          "verticalAlign=middle",
          "spacingLeft=4",
          "spacingRight=4",
          "whiteSpace=wrap",
          "html=1",
          field.isPrimary ? "fontStyle=1" : "",
        ]
          .filter(Boolean)
          .join(";"),
        vertex: "1",
        parent: entityId,
      });

      fieldCell.ele("mxGeometry", {
        y: (HEADER_HEIGHT + fieldIndex * FIELD_HEIGHT).toString(),
        width: ENTITY_WIDTH.toString(),
        height: FIELD_HEIGHT.toString(),
        as: "geometry",
      });
    });
  });

  // Add relationships as edges
  relationships.forEach((rel, index) => {
    const sourceEntity = entities.get(rel.from);
    const targetEntity = entities.get(rel.to);

    if (!sourceEntity || !targetEntity) return;

    const sourceEntityId = entityIdMap.get(rel.from);
    const targetEntityId = entityIdMap.get(rel.to);

    if (!sourceEntityId || !targetEntityId) return;

    // Find field indices
    const sourceFieldIndex = sourceEntity.fields.findIndex(
      (f) => f.name === rel.fromField,
    );
    const targetFieldIndex = rel.toField
      ? targetEntity.fields.findIndex((f) => f.name === rel.toField)
      : 0;

    const sourceId =
      sourceFieldIndex >= 0
        ? `${sourceEntityId}F${sourceFieldIndex + 1}`
        : sourceEntityId;
    const targetId =
      targetFieldIndex >= 0 && rel.toField
        ? `${targetEntityId}F${targetFieldIndex + 1}`
        : targetEntityId;

    const arrowStyle = getArrowStyle(rel.type);
    const edgeId = `C${index + 1}`;

    const edgeCell = doc.ele("mxCell", {
      id: edgeId,
      style: [
        "edgeStyle=entityRelationEdgeStyle",
        "rounded=0",
        "orthogonalLoop=1",
        "jettySize=auto",
        "html=1",
        `endArrow=${arrowStyle.endArrow}`,
        `startArrow=${arrowStyle.startArrow}`,
      ].join(";"),
      edge: "1",
      parent: "layer",
      source: sourceId,
      target: targetId,
    });

    edgeCell.ele("mxGeometry", {
      relative: "1",
      as: "geometry",
    });
  });

  // Convert to XML string with proper formatting
  return doc.end({ prettyPrint: true });
}

/**
 * Format field value for display
 */
function formatFieldValue(field: EntityField): string {
  let value = field.name;

  // Add type information
  if (field.type && field.type !== "unknown") {
    value += `: ${field.type}`;
  }

  // Add nullable indicator
  if (field.isNullable) {
    value += "?";
  }

  // Add PK indicator
  if (field.isPrimary) {
    value = `[PK] ${value}`;
  }

  return value;
}
