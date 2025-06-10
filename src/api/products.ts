import { Brand, ProductDB, Webpage } from "../interfaces";
import prisma from "../utils/prisma";

export async function getProducts(): Promise<ProductDB[]> {
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
}

export async function getProductsByWebpage(
  webpage: Webpage
): Promise<ProductDB[]> {
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
}

export async function getProductsByWebpageAndBrand(
  webpage: Webpage,
  brand: Brand
): Promise<ProductDB[]> {
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
}

export async function deleteAndUpsertProducts(products: ProductDB[]) {
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
          connect: { sku: product.BaseProduct?.sku },
        },
      },
    });
  }
  console.log("Products upserted");
}

export async function fullUpsertProducts(products: ProductDB[]) {
  await deleteProducts(products);

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        sku_webpageId: { sku: product.sku, webpageId: product.Webpage.id },
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
          connect: { sku: product.BaseProduct?.sku },
        },
      },
    });
  }
  console.log("Products fullUpserted");
}

export async function deleteProducts(products: ProductDB[]) {
  await prisma.product.deleteMany({
    where: {
      webpageId: {
        in: products.map((p) => p.Webpage.id),
      },
      sku: {
        notIn: products.map((p) => p.sku),
      },
    },
  });
}
