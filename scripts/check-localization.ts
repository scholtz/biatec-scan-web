#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FileData {
  path: string;
  content: string;
  data: any;
  lines: string[];
}

interface DuplicateKey {
  key: string;
  line: number;
  file: string;
}

interface LocalizationFiles {
  [fileName: string]: FileData;
}

class LocalizationChecker {
  private errors: string[] = [];
  private warnings: string[] = [];
  private files: LocalizationFiles = {};

  private readonly LOCALES_DIR = path.join(
    __dirname,
    "..",
    "src",
    "i18n",
    "locales",
  );
  private readonly LOCALE_FILES = [
    "en.json",
    "sk.json",
    "zh.json",
    "de.json",
    "es.json",
    "cs.json",
    "ru.json",
    "pl.json",
    "hu.json",
  ];

  log(message: string, type: "info" | "error" | "warning" = "info"): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  error(message: string, file?: string | null, line?: number | null): void {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.errors.push(fullMessage);
    this.log(fullMessage, "error");
  }

  warning(message: string, file?: string | null, line?: number | null): void {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.warnings.push(fullMessage);
    this.log(fullMessage, "warning");
  }

  loadFiles(): void {
    this.log("Loading localization files...");

    for (const fileName of this.LOCALE_FILES) {
      const filePath = path.join(this.LOCALES_DIR, fileName);

      try {
        const content = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        this.files[fileName] = {
          path: filePath,
          content: content,
          data: data,
          lines: content.split("\n"),
        };
        this.log(`Loaded ${fileName}`);
      } catch (error) {
        this.error(
          `Failed to load ${fileName}: ${(error as Error).message}`,
          fileName,
        );
      }
    }
  }

  findDuplicateKeysInText(content: string, fileName: string): DuplicateKey[] {
    const duplicates: DuplicateKey[] = [];
    const lines = content.split("\n");
    const seenKeys = new Set<string>();
    const keyRegex = /^  "([^"]+)":/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(keyRegex);
      if (match) {
        const key = match[1];
        // Only check top-level keys (2 spaces indentation)
        const indent = lines[i].match(/^ */)?.[0].length ?? 0;
        if (indent === 2) {
          if (seenKeys.has(key)) {
            duplicates.push({
              key: key,
              line: i + 1,
              file: fileName,
            });
          }
          seenKeys.add(key);
        }
      }
    }

    return duplicates;
  }

  checkDuplicateKeys(): void {
    this.log("Checking for duplicate keys...");

    for (const [fileName, fileData] of Object.entries(this.files)) {
      const duplicates = this.findDuplicateKeysInText(
        fileData.content,
        fileName,
      );

      if (duplicates.length > 0) {
        for (const duplicate of duplicates) {
          this.error(
            `Duplicate key "${duplicate.key}" found at line ${duplicate.line}`,
            fileName,
            duplicate.line,
          );
        }
      }
    }
  }

  getObjectStructure(obj: any, prefix: string = ""): string[] {
    const structure: string[] = [];

    function traverse(current: any, currentPath: string): void {
      if (typeof current !== "object" || current === null) return;

      const keys = Object.keys(current).sort();

      for (const key of keys) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        structure.push(fullPath);

        if (typeof current[key] === "object" && current[key] !== null) {
          traverse(current[key], fullPath);
        }
      }
    }

    traverse(obj, prefix);
    return structure;
  }

  checkStructureConsistency(): void {
    this.log("Checking structure consistency...");

    const structures: { [fileName: string]: string[] } = {};
    const referenceFile = "en.json";

    // Get reference structure
    if (this.files[referenceFile]) {
      structures[referenceFile] = this.getObjectStructure(
        this.files[referenceFile].data,
      );
    } else {
      this.error(`Reference file ${referenceFile} not found`);
      return;
    }

    // Compare all other files to reference
    for (const [fileName, fileData] of Object.entries(this.files)) {
      if (fileName === referenceFile) continue;

      const structure = this.getObjectStructure(fileData.data);
      structures[fileName] = structure;

      // Check if structures match
      if (structure.length !== structures[referenceFile].length) {
        this.error(
          `Structure length mismatch: ${referenceFile} has ${structures[referenceFile].length} keys, ${fileName} has ${structure.length} keys`,
          fileName,
        );
        continue;
      }

      // Check for missing keys
      const missingKeys = structures[referenceFile].filter(
        (key) => !structure.includes(key),
      );
      if (missingKeys.length > 0) {
        this.error(
          `Missing keys in ${fileName}: ${missingKeys.join(", ")}`,
          fileName,
        );
      }

      // Check for extra keys
      const extraKeys = structure.filter(
        (key) => !structures[referenceFile].includes(key),
      );
      if (extraKeys.length > 0) {
        this.error(
          `Extra keys in ${fileName}: ${extraKeys.join(", ")}`,
          fileName,
        );
      }

      // Check order consistency
      for (let i = 0; i < structure.length; i++) {
        if (structure[i] !== structures[referenceFile][i]) {
          this.warning(
            `Key order mismatch at position ${i}: expected "${structures[referenceFile][i]}", found "${structure[i]}"`,
            fileName,
          );
          break; // Only report first mismatch
        }
      }
    }
  }

  checkLineNumbers(): void {
    this.log("Checking line number consistency...");

    const referenceFile = "en.json";
    if (!this.files[referenceFile]) {
      this.error(`Reference file ${referenceFile} not found`);
      return;
    }

    const referenceLines = this.files[referenceFile].lines;

    // Find all key line numbers in reference file
    const keyLineNumbers: { [key: string]: number } = {};
    const keyRegex = /^  "([^"]+)":/;

    for (let i = 0; i < referenceLines.length; i++) {
      const match = referenceLines[i].match(keyRegex);
      if (match) {
        const key = match[1];
        // Only track top-level keys (not nested keys)
        const indent = referenceLines[i].match(/^ */)?.[0].length ?? 0;
        if (indent === 2) {
          // Top-level keys have 2 spaces indentation
          keyLineNumbers[key] = i + 1; // +1 because arrays are 0-indexed but lines are 1-indexed
        }
      }
    }

    // Check other files
    for (const [fileName, fileData] of Object.entries(this.files)) {
      if (fileName === referenceFile) continue;

      for (const [key, expectedLine] of Object.entries(keyLineNumbers)) {
        const keyRegex = new RegExp(`^  "${key}":`);
        let found = false;

        for (let i = 0; i < fileData.lines.length; i++) {
          if (keyRegex.test(fileData.lines[i])) {
            if (i + 1 !== expectedLine) {
              this.error(
                `Key "${key}" at line ${i + 1} in ${fileName}, expected line ${expectedLine}`,
                fileName,
                i + 1,
              );
            }
            found = true;
            break;
          }
        }

        if (!found) {
          this.error(`Key "${key}" not found in ${fileName}`, fileName);
        }
      }
    }
  }

  validateJSON(): void {
    this.log("Validating JSON syntax...");

    for (const [fileName, fileData] of Object.entries(this.files)) {
      try {
        JSON.parse(fileData.content);
        this.log(`JSON syntax valid for ${fileName}`);
      } catch (error) {
        this.error(
          `Invalid JSON syntax: ${(error as Error).message}`,
          fileName,
        );
      }
    }
  }

  fixLocalizationFiles(): void {
    this.log("Fixing localization files...");

    const referenceFile = "en.json";
    if (!this.files[referenceFile]) {
      this.error(`Reference file ${referenceFile} not found`);
      return;
    }

    // Fix each language file
    for (const [fileName, fileData] of Object.entries(this.files)) {
      if (fileName === referenceFile) continue;

      this.log(`Fixing ${fileName}...`);

      // Remove duplicates and reorder
      const fixedContent = this.removeDuplicatesAndReorder(
        fileData.content,
        this.files[referenceFile].content,
      );

      // Write back the fixed content
      try {
        fs.writeFileSync(fileData.path, fixedContent, "utf8");
        this.log(`Fixed ${fileName}`);
      } catch (error) {
        this.error(
          `Failed to write ${fileName}: ${(error as Error).message}`,
          fileName,
        );
      }
    }
  }

  removeDuplicatesAndReorder(
    content: string,
    referenceContent: string,
  ): string {
    // Parse the JSON - this automatically removes duplicates by keeping the last occurrence
    let data: any;
    try {
      data = JSON.parse(content);
    } catch (error) {
      this.error(`Failed to parse JSON: ${(error as Error).message}`);
      return content;
    }

    // Parse reference to get key order
    let referenceData: any;
    try {
      referenceData = JSON.parse(referenceContent);
    } catch (error) {
      this.error(`Failed to parse reference JSON: ${(error as Error).message}`);
      return content;
    }

    // Get the key order from reference
    const keyOrder = Object.keys(referenceData);

    // Reorder the data to match reference order
    const reordered: { [key: string]: any } = {};
    keyOrder.forEach((key) => {
      if (data.hasOwnProperty(key)) {
        reordered[key] = data[key];
      }
    });

    // Add any keys that exist in data but not in reference (shouldn't happen in normal cases)
    Object.keys(data).forEach((key) => {
      if (!reordered.hasOwnProperty(key)) {
        reordered[key] = data[key];
      }
    });

    // Return formatted JSON
    return JSON.stringify(reordered, null, 2) + "\n";
  }

  run(): void {
    this.log("Starting localization files check...");

    this.loadFiles();
    this.validateJSON();
    this.checkDuplicateKeys();
    this.checkStructureConsistency();
    this.checkLineNumbers();

    // Summary
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;

    console.log("\n" + "=".repeat(50));
    console.log("SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log("\nERRORS:");
      this.errors.forEach((error) => console.log(`❌ ${error}`));
    }

    if (totalWarnings > 0) {
      console.log("\nWARNINGS:");
      this.warnings.forEach((warning) => console.log(`⚠️  ${warning}`));
    }

    if (totalErrors === 0 && totalWarnings === 0) {
      console.log("\n✅ All localization files are valid!");
    } else {
      console.log("\n🔧 Please fix the issues above.");
      process.exit(1);
    }
  }
}

// Run the checker
const checker = new LocalizationChecker();
const args = process.argv.slice(2);

if (args.includes("--fix")) {
  checker.loadFiles();
  checker.validateJSON();
  checker.fixLocalizationFiles();
  console.log(
    "\n🔧 Localization files have been fixed. Run the checker again to verify.",
  );
} else {
  checker.run();
}
