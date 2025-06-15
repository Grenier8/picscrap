import { Webpage } from "../interfaces";
import { Logger } from "../utils/logger";
import prisma from "../utils/prisma";

export async function getWebpages(): Promise<Webpage[]> {
  try {
    const webpages = await prisma.webpage.findMany();
    return webpages;
  } catch (error: any) {
    await Logger.databaseError(error);
    return [];
  }
}

export async function getWebpageById(id: number): Promise<Webpage | undefined> {
  try {
    const webpage = await prisma.webpage.findUnique({ where: { id } });
    if (!webpage) {
      throw new Error(`Webpage with id ${id} not found`);
    }
    return webpage;
  } catch (error: any) {
    await Logger.databaseError(error);
    return undefined;
  }
}
