import { parse } from "@babel/parser";
import { readFile } from "node:fs/promises";
import type { ParseResult } from "@babel/parser";

/**
 * Parse TypeScript file and return AST
 */
export async function parseTypeScriptFile(
  filePath: string,
): Promise<ParseResult<any>> {
  const code = await readFile(filePath, "utf-8");
  return parse(code, {
    sourceType: "module",
    plugins: [
      "typescript",
      "decorators-legacy", // Support for TypeORM decorators
      "classProperties",
    ],
  });
}

/**
 * Parse multiple TypeScript files
 */
export async function parseMultipleFiles(
  filePaths: string[],
): Promise<Map<string, ParseResult<any>>> {
  const results = new Map<string, ParseResult<any>>();

  for (const filePath of filePaths) {
    try {
      const ast = await parseTypeScriptFile(filePath);
      results.set(filePath, ast);
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
    }
  }

  return results;
}
