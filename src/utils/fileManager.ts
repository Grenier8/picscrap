import fs from "fs";
import {
  AssistantProduct,
  AssistantResponse,
  BaseProductScrap,
  ProductScrap,
} from "../interfaces";
import { Logger } from "./logger";

export const saveProductsToFile = (
  products: ProductScrap[] | BaseProductScrap[],
  pageId: number
) => {
  Logger.info(`Saving products to file for page ${pageId}`);

  const filePath = `db/db_${pageId}.json`;
  const dir = "db";

  createDir(dir);

  const jsonData = { products };
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`Products saved to ${filePath}`);
};

export const saveAssistantProductsToFile = (
  baseProducts: AssistantProduct[],
  secondaryProducts: AssistantProduct[],
  filename: string
) => {
  Logger.info(`Saving assistant products to file for ${filename}`);

  const filePath = `correlations/${filename}.json`;
  const dir = "correlations";

  createDir(dir);

  const jsonData = { baseProducts, secondaryProducts };
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`Assistant products saved to ${filePath}`);
};

export const saveCorrelationsToFile = (
  correlations: AssistantResponse,
  filename: string
) => {
  Logger.info(`Saving correlations to file for ${filename}`);

  const filePath = `correlations/${filename}RES.json`;
  const dir = "correlations";

  createDir(dir);

  const jsonData = { correlations };
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`Correlations saved to ${filePath}`);
};

export const createDir = (dir: string) => {
  Logger.info(`Creating directory ${dir}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

export const saveConversationToFile = (
  conversation: { role: string; content: string }[],
  filename: string
) => {
  Logger.info(`Saving conversation to file for ${filename}`);

  const filePath = `conversations/${filename}.json`;
  const dir = "conversations";

  createDir(dir);

  const jsonData = { conversation };
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`Conversation saved to ${filePath}`);
};
