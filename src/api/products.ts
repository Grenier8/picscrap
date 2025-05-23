import { BaseProductDB, Brand, ProductDB } from "../interfaces";
import prisma from "../utils/prisma";
import { getBaseProductBySku } from "./base-products";
import { getBrandById, getBrandByName } from "./brands";

export async function getProducts() {
  const products = await prisma.product.findMany();
  return products;
}

export async function upsertProducts(products: ProductDB[]) {
  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku_webpageId: { sku: product.sku, webpageId: product.Webpage.id },
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
            where: { name: product.Brand.name },
            create: { name: product.Brand.name },
          },
        },
        Webpage: {
          connect: { url: product.Webpage.url },
        },
        BaseProduct: {
          connect: { sku: product.BaseProduct?.sku },
        },
      },
    });
  }
  console.log("Products upserted");
}
