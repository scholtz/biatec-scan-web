/**
 * Service for managing favorite assets in localStorage
 */

const FAVORITES_KEY = 'biatec-favorite-assets';

export interface FavoriteAsset {
  index: number;
  addedAt: string;
}

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
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }

  isFavorite(assetIndex: number): boolean {
    return this.favorites.has(assetIndex);
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
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing favorites from localStorage:', error);
    }
  }
}

export const favoriteService = new FavoriteService();