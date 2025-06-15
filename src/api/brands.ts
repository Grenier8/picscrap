import { Brand } from "../interfaces";
import { Logger } from "../utils/logger";
import prisma from "../utils/prisma";

export async function getBrands(): Promise<Brand[]> {
  try {
    const brands = await prisma.brand.findMany();
    return brands;
  } catch (error: any) {
    await Logger.databaseError(error);
    return [];
  }
}

export async function getBrandById(id: number): Promise<Brand | undefined> {
  try {
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new Error(`Brand with id ${id} not found`);
    }
    return brand;
  } catch (error: any) {
    await Logger.databaseError(error);
    return undefined;
  }
}

export async function getBrandByName(name: string): Promise<Brand | undefined> {
  try {
    const brand = await prisma.brand.findUnique({ where: { name } });
    if (!brand) {
      throw new Error(`Brand with name ${name} not found`);
    }
    return brand;
  } catch (error: any) {
    await Logger.databaseError(error);
    return undefined;
  }
}
