import { Brand, ProductDB, Webpage } from "../interfaces";
import { Logger } from "../utils/logger";
import prisma from "../utils/prisma";

export async function getProducts(): Promise<ProductDB[]> {
  try {
    const products = await prisma.product.findMany({
      include: {
        BaseProduct: true,
        Webpage: true,
        Brand: true,
      },
    });
    return products.map((p: any) => ({
      ...p,
      link: p.link || "",
      image: p.image || "",
      BaseProduct: p.BaseProduct
        ? {
            name: p.BaseProduct?.name || "",
            link: p.BaseProduct?.link || "",
            image: p.BaseProduct?.image || "",
            Brand: p.Brand,
            sku: p.BaseProduct?.sku || "",
            price: p.BaseProduct?.price || 0,
            outOfStock: p.BaseProduct?.outOfStock || false,
          }
        : undefined,
    }));
  } catch (error: any) {
    await Logger.databaseError(error);
    return [];
  }
}

export async function getProductsByWebpage(
  webpage: Webpage
): Promise<ProductDB[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        webpageId: webpage.id,
      },
      include: {
        BaseProduct: true,
        Webpage: true,
        Brand: true,
      },
    });
    return products.map((p: any) => ({
      ...p,
      link: p.link || "",
      image: p.image || "",
      BaseProduct: p.BaseProduct
        ? {
            name: p.BaseProduct?.name || "",
            link: p.BaseProduct?.link || "",
            image: p.BaseProduct?.image || "",
            Brand: p.Brand,
            sku: p.BaseProduct?.sku || "",
            price: p.BaseProduct?.price || 0,
            outOfStock: p.BaseProduct?.outOfStock || false,
          }
        : undefined,
    }));
  } catch (error: any) {
    await Logger.databaseError(error);
    return [];
  }
}

export async function getProductsByWebpageAndBrand(
  webpage: Webpage,
  brand: Brand
): Promise<ProductDB[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        webpageId: webpage.id,
        brandId: brand.id,
      },
      include: {
        BaseProduct: true,
        Webpage: true,
        Brand: true,
      },
    });
    return products.map((p: any) => ({
      ...p,
      link: p.link || "",
      image: p.image || "",
      BaseProduct: p.BaseProduct
        ? {
            name: p.BaseProduct?.name || "",
            link: p.BaseProduct?.link || "",
            image: p.BaseProduct?.image || "",
            Brand: p.Brand,
            sku: p.BaseProduct?.sku || "",
            price: p.BaseProduct?.price || 0,
            outOfStock: p.BaseProduct?.outOfStock || false,
          }
        : undefined,
    }));
  } catch (error: any) {
    await Logger.databaseError(error);
    return [];
  }
}

export async function deleteAndUpsertProducts(products: ProductDB[]) {
  try {
    await prisma.product.deleteMany({
      where: {
        webpageId: {
          in: products.map((p: any) => p.Webpage.id),
        },
        sku: {
          notIn: products.map((p: any) => p.sku),
        },
      },
    });
    await upsertProducts(products);
  } catch (error: any) {
    await Logger.databaseError(error);
  }
}

export async function upsertProducts(products: ProductDB[]) {
  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: {
          sku_webpageId_baseProductId: {
            sku: product.sku,
            webpageId: product.Webpage.id,
            baseProductId: product.BaseProduct?.id || 0,
          },
        },
        update: {
          name: product.name,
          link: product.link,
          price: product.price || 0,
          outOfStock: product.outOfStock,
          image: product.image,
        },
        create: {
          name: product.name,
          link: product.link,
          price: product.price || 0,
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
            connect: { sku: product.BaseProduct.sku },
          },
        },
      });
    }
    console.log("Products upserted");
  } catch (error: any) {
    await Logger.databaseError(error);
  }
}

export async function fullUpsertProducts(products: ProductDB[]) {
  await deleteProductsByWebpage(products[0].Webpage.id);

  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: {
          sku_webpageId_baseProductId: {
            sku: product.sku,
            webpageId: product.Webpage.id,
            baseProductId: product.BaseProduct?.id || 0,
          },
        },
        update: {
          name: product.name,
          link: product.link,
          price: product.price || 0,
          outOfStock: product.outOfStock,
          image: product.image,
          BaseProduct: {
            connect: { sku: product.BaseProduct?.sku },
          },
        },
        create: {
          name: product.name,
          sku: product.sku,
          link: product.link,
          price: product.price || 0,
          outOfStock: product.outOfStock,
          image: product.image,
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
            connect: { sku: product.BaseProduct.sku },
          },
        },
      });
    }
    Logger.info("Products fullUpserted");
  } catch (error: any) {
    await Logger.databaseError(error);
  }
}

export async function deleteProductsByWebpage(webpageId: number) {
  try {
    await prisma.product.deleteMany({
      where: {
        webpageId: webpageId,
      },
    });
    Logger.info(`Products for webpage ${webpageId} deleted`);
  } catch (error: any) {
    await Logger.databaseError(error);
  }
}
