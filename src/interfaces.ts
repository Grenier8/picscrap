export interface ProductDB {
  name: string;
  sku: string;
  link: string;
  price: number;
  Webpage: Webpage;
  outOfStock: boolean | null;
  image: string;
  Brand: Brand;
  BaseProduct?: BaseProductDB;
}

export interface ProductScrap {
  name: string;
  sku: string;
  link: string;
  price: number;
  webpage: string;
  baseProductSku: string;
  outOfStock: boolean | null;
  image: string;
  brand: string;
}

export interface Brand {
  name: string;
}

export interface Webpage {
  id: number;
  name: string;
  url: string;
  isBasePage: boolean;
}

export interface BaseProductDB {
  name: string;
  link: string | null;
  price: number;
  outOfStock: boolean | null;
  image: string | null;
  Brand: Brand;
  sku: string;
}

export interface BaseProductScrap {
  name: string;
  link: string;
  price: number;
  outOfStock: boolean | null;
  image: string;
  brand: string;
  sku: string;
}

export interface FindProductsBetweenPagesResults {
  status: string;
  totalProducts: number;
  foundProducts: number;
  notFoundProducts: ProductDB[];
  date: string;
}
