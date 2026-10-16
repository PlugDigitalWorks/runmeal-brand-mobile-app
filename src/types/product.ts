/** Mirrors runmeal-brand-fe-website/src/types/product.ts (storefront contract). */
export type OptionGroupType = 'SINGLE' | 'MULTI' | 'VARIANT' | 'INGREDIENT';

export interface OptionGroupItem {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: OptionGroupType;
  isRequired: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  options: OptionGroupItem[];
  sortOrder?: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number | string;
  discountedPrice?: number | string | null;
  imageUrl?: string | null;
  isActive: boolean;
  optionGroups?: OptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  products?: Product[];
}

export interface Menu {
  brandId: string;
  branchId?: string;
  currency: string;
  currencySymbol: string;
  categories: MenuCategory[];
}
