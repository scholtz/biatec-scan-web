import { ref } from 'vue';

/**
 * Service for managing favorite assets in localStorage
 */

const FAVORITES_KEY = 'biatec-favorite-assets';

export interface FavoriteAsset {
  index: number;
  addedAt: string;
}

// Reactive state for favorites
const favoritesSet = ref<Set<number>>(new Set());

class FavoriteService {
  private favorites: Set<number> = new Set();

  constructor() {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const data: FavoriteAsset[] = JSON.parse(stored);
        this.favorites = new Set(data.map(f => f.index));
        favoritesSet.value = new Set(this.favorites);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
  }

  private saveFavorites(): void {
    try {
      const data: FavoriteAsset[] = Array.from(this.favorites).map(index => ({
        index,
        addedAt: new Date().toISOString()
      }));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(data));
      // Update reactive state
      favoritesSet.value = new Set(this.favorites);
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }

  isFavorite(assetIndex: number): boolean {
    return this.favorites.has(assetIndex);
  }

  // Reactive version of isFavorite
  isReactiveFavorite(assetIndex: number): boolean {
    return favoritesSet.value.has(assetIndex);
  }

  addFavorite(assetIndex: number): void {
    if (!this.favorites.has(assetIndex)) {
      this.favorites.add(assetIndex);
      this.saveFavorites();
    }
  }

  removeFavorite(assetIndex: number): void {
    if (this.favorites.has(assetIndex)) {
      this.favorites.delete(assetIndex);
      this.saveFavorites();
    }
  }

  toggleFavorite(assetIndex: number): boolean {
    if (this.isFavorite(assetIndex)) {
      this.removeFavorite(assetIndex);
      return false;
    } else {
      this.addFavorite(assetIndex);
      return true;
    }
  }

  getFavoriteAssetIds(): number[] {
    return Array.from(this.favorites);
  }

  getFavoriteAssets(): FavoriteAsset[] {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting favorite assets from localStorage:', error);
    }
    return [];
  }

  clearFavorites(): void {
    this.favorites.clear();
    favoritesSet.value.clear();
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing favorites from localStorage:', error);
    }
  }

  // Get reactive favorites for components
  getReactiveFavorites() {
    return favoritesSet;
  }
}

export const favoriteService = new FavoriteService();