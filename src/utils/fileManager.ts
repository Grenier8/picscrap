import fs from "fs";
import { ProductScrap, BaseProductScrap } from "../interfaces";

export const saveProductsToFile = (
  products: ProductScrap[] | BaseProductScrap[],
  pageId: number
) => {
  const filePath = `db/db_${pageId}.json`;
  const dir = "db";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const jsonData = { products };
  fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`Products saved to ${filePath}`);
};
