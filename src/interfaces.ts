export interface Product {
    name: string | null;
    link: string | null;
    price: string | null;
    outOfStock: boolean | null;
    image: string | null;
    brand: string | null;
    sku: string | null;
}
export interface Page {
    name: string;
    id: string;
    url: string;
    dbPort: number;
}

export interface FindProductsBetweenPagesResults {
    status: string;
    totalProducts: number;
    foundProducts: number;
    notFoundProducts: Product[];
    date: string;
}