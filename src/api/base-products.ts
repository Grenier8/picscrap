import { BaseProductDB, ProductDB } from "../interfaces";
import prisma from "../utils/prisma";

export async function getBaseProducts() {
  const baseProducts = await prisma.baseProduct.findMany();
  return baseProducts;
}

export async function upsertBaseProducts(products: BaseProductDB[]) {
  for (const product of products) {
    await prisma.baseProduct.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        link: product.link,
        price: product.price,
        outOfStock: product.outOfStock,
        image: product.image,
      },
      create: {
        name: product.name,
        link: product.link,
        price: product.price,
        outOfStock: product.outOfStock,
        image: product.image,
        sku: product.sku,
        Brand: {
          connectOrCreate: {
            where: { name: product.brand.name },
            create: { name: product.brand.name },
          },
        },
      },
    });
  }
}

export async function updateBaseProducts(products: ProductDB[]) {
  await prisma.baseProduct.updateMany({
    data: products.map((product) => ({
      ...product,
      name: product.name || "",
      link: product.link || "",
      price: product.price || 0,
      outOfStock: product.outOfStock || false,
      image: product.image || "",
      brand: product.brand || "",
      sku: product.sku || "",
    })),
  });
}
