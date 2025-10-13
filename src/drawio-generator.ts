import { create } from "xmlbuilder2";
import elkjs from "elkjs";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import type { ParsedEntities, Relationship, EntityField } from "./types.ts";
import { getArrowStyle } from "./relationship-analyzer.ts";

const ENTITY_WIDTH = 180;
const FIELD_HEIGHT = 26;
const HEADER_HEIGHT = 30;
const NODE_SPACING = 50;
const LAYER_SPACING = 120;
const EDGE_SPACING = 30;

/**
 * Generate Draw.io XML from parsed entities
 */
export async function generateDrawioXML(
  parsedEntities: ParsedEntities,
  relationships: Relationship[],
): Promise<string> {
  const { entities } = parsedEntities;

  const ELK = elkjs.default;
  const elk = new ELK();

  // Build ELK graph
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": NODE_SPACING.toString(),
      "elk.layered.spacing.nodeNodeBetweenLayers": LAYER_SPACING.toString(),
      "elk.layered.spacing.edgeNodeBetweenLayers": "75",
      "elk.layered.spacing.edgeEdgeBetweenLayers": EDGE_SPACING.toString(),
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: [],
    edges: [],
  };

  // Add entities as nodes
  entities.forEach((entity, name) => {
    const height = HEADER_HEIGHT + entity.fields.length * FIELD_HEIGHT;
    elkGraph.children!.push({
      id: name,
      width: ENTITY_WIDTH,
      height: height,
    });
  });

  // Add relationships as edges
  relationships.forEach((rel, index) => {
    if (entities.has(rel.from) && entities.has(rel.to)) {
      elkGraph.edges!.push({
        id: `edge-${index}`,
        sources: [rel.from],
        targets: [rel.to],
      } as ElkExtendedEdge);
    }
  });

  // Compute layout
  const layoutResult = await elk.layout(elkGraph);

  // Extract entity positions from layout result
  const entityPositions = new Map<
    string,
    { x: number; y: number; height: number }
  >();

  layoutResult.children?.forEach((node: ElkNode) => {
    entityPositions.set(node.id, {
      x: node.x || 0,
      y: node.y || 0,
      height: node.height || 0,
    });
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
