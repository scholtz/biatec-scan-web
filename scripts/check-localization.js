#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales");
const LOCALE_FILES = [
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

class LocalizationChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.files = {};
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  error(message, file = null, line = null) {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.errors.push(fullMessage);
    this.log(fullMessage, "error");
  }

  warning(message, file = null, line = null) {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.warnings.push(fullMessage);
    this.log(fullMessage, "warning");
  }

  loadFiles() {
    this.log("Loading localization files...");

    for (const fileName of LOCALE_FILES) {
      const filePath = path.join(LOCALES_DIR, fileName);

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
        this.error(`Failed to load ${fileName}: ${error.message}`, fileName);
      }
    }
  }

  findDuplicateKeys(obj, path = "", visited = new Set()) {
    const duplicates = [];

    function traverse(current, currentPath) {
      if (typeof current !== "object" || current === null) return;

      const keys = Object.keys(current);
      const seenKeys = new Set();

      for (const key of keys) {
        if (seenKeys.has(key)) {
          duplicates.push({
            key: key,
            path: currentPath,
            fullPath: currentPath ? `${currentPath}.${key}` : key,
          });
        }
        seenKeys.add(key);

        if (typeof current[key] === "object" && current[key] !== null) {
          traverse(current[key], currentPath ? `${currentPath}.${key}` : key);
        }
      }
    }

    traverse(obj, path);
    return duplicates;
  }

  checkDuplicateKeys() {
    this.log("Checking for duplicate keys...");

    for (const [fileName, fileData] of Object.entries(this.files)) {
      const duplicates = this.findDuplicateKeys(fileData.data);

      if (duplicates.length > 0) {
        for (const duplicate of duplicates) {
          this.error(
            `Duplicate key "${duplicate.key}" found at path "${duplicate.fullPath}"`,
            fileName,
          );
        }
      }
    }
  }

  getObjectStructure(obj, prefix = "") {
    const structure = [];

    function traverse(current, currentPath) {
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

  checkStructureConsistency() {
    this.log("Checking structure consistency...");

    const structures = {};
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

  checkLineNumbers() {
    this.log("Checking line number consistency...");

    const referenceFile = "en.json";
    if (!this.files[referenceFile]) {
      this.error(`Reference file ${referenceFile} not found`);
      return;
    }

    const referenceLines = this.files[referenceFile].lines;

    // Find section starts in reference file
    const sectionStarts = {};
    const sectionRegex = /^  "([^"]+)": \{$/;

    for (let i = 0; i < referenceLines.length; i++) {
      const match = referenceLines[i].match(sectionRegex);
      if (match) {
        sectionStarts[match[1]] = i + 1; // +1 because arrays are 0-indexed but lines are 1-indexed
      }
    }

    // Check other files
    for (const [fileName, fileData] of Object.entries(this.files)) {
      if (fileName === referenceFile) continue;

      for (const [section, expectedLine] of Object.entries(sectionStarts)) {
        const sectionRegex = new RegExp(`^  "${section}": \\{$`);
        let found = false;

        for (let i = 0; i < fileData.lines.length; i++) {
          if (sectionRegex.test(fileData.lines[i])) {
            if (i + 1 !== expectedLine) {
              this.warning(
                `Section "${section}" starts at line ${i + 1} in ${fileName}, expected line ${expectedLine}`,
                fileName,
                i + 1,
              );
            }
            found = true;
            break;
          }
        }

        if (!found) {
          this.error(`Section "${section}" not found in ${fileName}`, fileName);
        }
      }
    }
  }

  validateJSON() {
    this.log("Validating JSON syntax...");

    for (const [fileName, fileData] of Object.entries(this.files)) {
      try {
        JSON.parse(fileData.content);
        this.log(`JSON syntax valid for ${fileName}`);
      } catch (error) {
        this.error(`Invalid JSON syntax: ${error.message}`, fileName);
      }
    }
  }

  run() {
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
checker.run();
