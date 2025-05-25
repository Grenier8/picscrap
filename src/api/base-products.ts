import { BaseProductDB } from "../interfaces";
import prisma from "../utils/prisma";

export async function getBaseProducts(): Promise<BaseProductDB[]> {
  const baseProducts = await prisma.baseProduct.findMany({
    include: {
      Brand: true,
    },
  });
  return baseProducts;
}

export async function upsertBaseProducts(products: BaseProductDB[]) {
  for (const product of products) {
    await prisma.baseProduct.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        link: product.link,
        ...(product.price !== null ? { price: product.price } : {}),
        outOfStock: product.outOfStock,
        image: product.image,
      },
      create: {
        name: product.name,
        link: product.link,
        price: product.price ?? 0,
        outOfStock: product.outOfStock,
        image: product.image,
        sku: product.sku,
        Brand: {
          connectOrCreate: {
            where: { name: product.Brand.name ?? "UNKNOWN" },
            create: { name: product.Brand.name ?? "UNKNOWN" },
          },
        },
      },
    });
  }
  console.log("Base products upserted");
}

export async function getBaseProductById(id: number): Promise<BaseProductDB> {
  const baseProduct = await prisma.baseProduct.findUnique({
    where: { id },
    include: { Brand: true },
  });
  if (!baseProduct) {
    throw new Error(`Base product with id ${id} not found`);
  }
  return baseProduct;
}

export async function getBaseProductBySku(sku: string): Promise<BaseProductDB> {
  const baseProduct = await prisma.baseProduct.findUnique({
    where: { sku },
    include: { Brand: true },
  });
  if (!baseProduct) {
    throw new Error(`Base product with sku ${sku} not found`);
  }
  return baseProduct;
}
