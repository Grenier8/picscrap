import { Brand } from "../interfaces";
import prisma from "../utils/prisma";

export async function getBrands(): Promise<Brand[]> {
  const brands = await prisma.brand.findMany();
  return brands;
}

export async function getBrandById(id: number): Promise<Brand> {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) {
    throw new Error(`Brand with id ${id} not found`);
  }
  return brand;
}

export async function getBrandByName(name: string): Promise<Brand> {
  const brand = await prisma.brand.findUnique({ where: { name } });
  if (!brand) {
    throw new Error(`Brand with name ${name} not found`);
  }
  return brand;
}
