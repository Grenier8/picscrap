export interface ProductDB {
  name: string;
  sku: string;
  link: string;
  price: number;
  webpage: Webpage;
  outOfStock: boolean | null;
  image: string;
  brand: Brand;
}

export interface ProductScrap {
  name: string;
  sku: string;
  link: string;
  price: number;
  webpage: string;
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
}

export interface BaseProductDB {
  name: string;
  link: string;
  price: number;
  outOfStock: boolean | null;
  image: string;
  brand: Brand;
  sku: string;
  products: ProductDB[];
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
