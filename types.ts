export type Unit = 'mm' | 'ft';

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  unit: Unit;
}

export enum SectionType {
  SHELF = 'Shelf',
  DRAWER = 'Drawer',
  HANGING_ROD = 'Hanging Rod',
  LONG_SHELF = 'Long Shelf', // Usually at top
  SHOE_RACK = 'Shoe Rack',
  EMPTY = 'Empty Space'
}

export interface WardrobeItem {
  type: SectionType;
  heightPercentage: number; // How much vertical space this item takes in the column (0-100)
  label?: string;
}

export interface WardrobeColumn {
  widthPercentage: number; // How much horizontal space this column takes (0-100)
  items: WardrobeItem[];
}

export interface WardrobeDesign {
  id: string;
  name: string;
  description: string;
  features: string[]; // e.g., "LED Strip Lighting", "Soft-close drawers"
  layout: {
    columns: WardrobeColumn[];
    topShelfHeightPercentage?: number; // Optional full-width top shelf
  };
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}
