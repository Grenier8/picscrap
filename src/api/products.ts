import { BaseProductDB, ProductDB } from "../interfaces";
import prisma from "../utils/prisma";

export async function getProducts() {
  const products = await prisma.product.findMany();
  return products;
}

export async function upsertProducts(products: ProductDB[]) {
  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku_webpageId: { sku: product.sku, webpageId: product.webpage.id },
      },
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
        Webpage: {
          connect: { url: product.webpage.url },
        },
        BaseProduct: {
          connect: { sku: product.sku },
        },
      },
    });
  }
}

export async function updateProducts(products: ProductDB[]) {
  await prisma.product.updateMany({
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
