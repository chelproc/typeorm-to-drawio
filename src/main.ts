#!/usr/bin/env node

import { parseArgs, styleText } from "node:util";
import { writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMultipleFiles } from "./parser.ts";
import { extractEntities, mergeEntities } from "./entity-extractor.ts";
import { analyzeRelationships } from "./relationship-analyzer.ts";
import { generateDrawioXML } from "./drawio-generator.ts";
import type { CLIOptions } from "./types.ts";

// Parse command-line arguments
const { values, positionals } = parseArgs({
  options: {
    output: {
      type: "string",
      short: "o",
      description: "Output file path (default: entities.drawio)",
    },
    verbose: {
      type: "boolean",
      short: "v",
      default: false,
      description: "Enable verbose output",
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
      description: "Show help message",
    },
  },
  allowPositionals: true,
}) as { values: CLIOptions; positionals: string[] };

// Show help if requested or no files provided
if (values.help || positionals.length === 0) {
  console.log(styleText("cyan", "TypeORM to Draw.io ER Diagram Generator"));
  console.log();
  console.log("Usage: typeorm-to-drawio [options] <files...>");
  console.log();
  console.log("Options:");
  console.log(
    "  -o, --output <file>  Output file path (default: entities.drawio)",
  );
  console.log("  -v, --verbose        Enable verbose output");
  console.log("  -h, --help           Show help message");
  console.log();
  console.log("Examples:");
  console.log("  typeorm-to-drawio models/*.ts");
  console.log(
    "  typeorm-to-drawio models/User.ts models/Post.ts -o diagram.drawio",
  );
  console.log("  typeorm-to-drawio src/entities/**/*.entity.ts -v");
  process.exit(0);
}

async function main() {
  try {
    // Expand glob patterns and collect file paths
    const filePaths: string[] = [];

    for (const pattern of positionals) {
      if (pattern.includes("*")) {
        // Use Node.js fs/promises glob
        const matches = glob(pattern);
        for await (const match of matches) {
          filePaths.push(resolve(match));
        }
      } else {
        filePaths.push(resolve(pattern));
      }
    }

    if (filePaths.length === 0) {
      console.error(
        styleText("red", "Error: No files found matching the patterns"),
      );
      process.exit(1);
    }

    if (values.verbose) {
      console.log(styleText("blue", `Processing ${filePaths.length} files...`));
      filePaths.forEach((fp) => console.log(`  - ${fp}`));
    }

    // Parse TypeScript files
    const astMap = await parseMultipleFiles(filePaths);

    if (astMap.size === 0) {
      console.error(
        styleText("red", "Error: No valid TypeScript files could be parsed"),
      );
      process.exit(1);
    }

    // Extract entities from each file
    const parsedResults = [];
    for (const [filePath, ast] of astMap.entries()) {
      const result = extractEntities(filePath, ast);
      parsedResults.push(result);
    }

    // Merge all entities and relationships
    const merged = mergeEntities(parsedResults);

    if (merged.entities.size === 0) {
      console.warn(
        styleText(
          "yellow",
          "Warning: No TypeORM entities found in the provided files",
        ),
      );
      process.exit(0);
    }

    if (values.verbose) {
      console.log(styleText("blue", `Found ${merged.entities.size} entities:`));
      merged.entities.forEach((entity) => {
        console.log(`  - ${entity.name} (${entity.fields.length} fields)`);
      });
      console.log(
        styleText("blue", `Found ${merged.relationships.length} relationships`),
      );
    }

    // Analyze relationships
    const relationships = analyzeRelationships(merged);

    // Generate Draw.io XML
    const xml = await generateDrawioXML(merged, relationships);

    // Write output file
    const outputPath = values.output || "entities.drawio";
    await writeFile(outputPath, xml, "utf-8");

    console.log(styleText("green", `✓ Successfully generated ${outputPath}`));
    console.log(styleText("gray", `  Entities: ${merged.entities.size}`));
    console.log(styleText("gray", `  Relationships: ${relationships.length}`));
  } catch (error) {
    console.error(styleText("red", "Error:"), error);
    process.exit(1);
  }
}

// Run main function
main();
