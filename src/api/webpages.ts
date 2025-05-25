import { Webpage } from "../interfaces";
import prisma from "../utils/prisma";

export async function getWebpages(): Promise<Webpage[]> {
  const webpages = await prisma.webpage.findMany();
  return webpages;
}

export async function getWebpageById(id: number): Promise<Webpage> {
  const webpage = await prisma.webpage.findUnique({ where: { id } });
  if (!webpage) {
    throw new Error(`Webpage with id ${id} not found`);
  }
  return webpage;
}
