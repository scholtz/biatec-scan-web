#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TranslationDictionary {
  [key: string]: string;
}

interface LanguageTranslations {
  [language: string]: TranslationDictionary;
}

interface LocalizationData {
  [key: string]: any;
}

class TranslationChecker {
  private errors: string[] = [];
  private warnings: string[] = [];
  private files: { [lang: string]: LocalizationData } = {};
  private translations: LanguageTranslations = {};

  private readonly LOCALES_DIR = path.join(
    __dirname,
    "..",
    "src",
    "i18n",
    "locales",
  );
  private readonly TRANSLATIONS_DIR = path.join(
    __dirname,
    "..",
    "src",
    "i18n",
    "locales",
  );
  private readonly LANGUAGES = ["sk", "zh", "de", "es", "cs", "ru", "pl", "hu"];

  log(message: string, type: "info" | "error" | "warning" = "info"): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  error(message: string, file?: string, line?: number): void {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.errors.push(fullMessage);
    this.log(fullMessage, "error");
  }

  warning(message: string, file?: string, line?: number): void {
    const location = file ? `${file}${line ? `:${line}` : ""}` : "";
    const fullMessage = location ? `${location} - ${message}` : message;
    this.warnings.push(fullMessage);
    this.log(fullMessage, "warning");
  }

  loadFiles(): void {
    this.log("Loading localization files...");

    // Load English reference
    const enFile = path.join(this.LOCALES_DIR, "en.json");
    const enData = JSON.parse(fs.readFileSync(enFile, "utf8"));
    this.files["en"] = enData;

    // Load other language files
    this.LANGUAGES.forEach((lang) => {
      const filePath = path.join(this.LOCALES_DIR, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      this.files[lang] = data;
      this.log(`Loaded ${lang}.json`);
    });
  }

  loadTranslations(): void {
    this.log("Loading translation dictionaries...");

    this.LANGUAGES.forEach((lang) => {
      const translationFile = path.join(this.TRANSLATIONS_DIR, `${lang}.json`);
      if (fs.existsSync(translationFile)) {
        const translations = JSON.parse(
          fs.readFileSync(translationFile, "utf8"),
        );
        this.translations[lang] = translations;
        this.log(`Loaded translations for ${lang}`);
      } else {
        this.warning(`Translation file not found: ${translationFile}`);
        this.translations[lang] = {};
      }
    });
  }

  // Get all keys from nested object
  getAllKeys(obj: any, prefix: string = ""): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  // Get value from nested object by key path
  getValueByPath(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  // Set value in nested object by key path
  setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Check if a string is untranslated (identical to English)
  isUntranslated(englishValue: any, translatedValue: any): boolean {
    if (
      typeof englishValue !== "string" ||
      typeof translatedValue !== "string"
    ) {
      return false;
    }

    // Remove placeholders for comparison
    const normalize = (str: string) =>
      str
        .replace(/\{[^}]+\}/g, "")
        .trim()
        .toLowerCase();
    return normalize(englishValue) === normalize(translatedValue);
  }

  // Translate text using loaded translation dictionary
  translateText(text: string, language: string): string {
    const langTranslations = this.translations[language];
    return langTranslations?.[text] || text;
  }

  checkUntranslatedPhrases(): void {
    this.log("Checking for untranslated phrases...");

    this.LANGUAGES.forEach((lang) => {
      const langData = this.files[lang];
      const allKeys = this.getAllKeys(langData);

      allKeys.forEach((key) => {
        const englishValue = this.getValueByPath(this.files["en"], key);
        const translatedValue = this.getValueByPath(langData, key);

        if (this.isUntranslated(englishValue, translatedValue)) {
          const translatedText = this.translateText(englishValue, lang);
          if (translatedText !== englishValue) {
            // Only update if we have a translation
            this.setValueByPath(langData, key, translatedText);
            this.log(`Translated ${lang}: ${key} = "${translatedText}"`);
          }
        }
      });
    });
  }

  saveFiles(): void {
    this.log("Saving updated localization files...");

    this.LANGUAGES.forEach((lang) => {
      const filePath = path.join(this.LOCALES_DIR, `${lang}.json`);
      const content = JSON.stringify(this.files[lang], null, 2) + "\n";
      fs.writeFileSync(filePath, content, "utf8");
      this.log(`Saved ${lang}.json`);
    });
  }

  run(): void {
    this.log("Starting translation check and fix...");

    this.loadFiles();
    this.loadTranslations();
    this.checkUntranslatedPhrases();
    this.saveFiles();

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
      console.log("\n✅ All untranslated phrases have been translated!");
    }
  }
}

// Run the translation checker
const checker = new TranslationChecker();
checker.run();
