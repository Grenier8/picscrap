import * as fs from "fs";
import { parse } from "csv-parse";
import { BaseProductDB, BaseProductScrap } from "../interfaces";

/**
 * Reads a CSV file and converts it to a JSON array of objects.
 * @param filePath Path to the CSV file
 * @returns Promise<BaseProduct[]>
 */
export function csvToJson(filePath: string): Promise<BaseProductScrap[]> {
  return new Promise((resolve, reject) => {
    const records: BaseProductScrap[] = [];
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: (header: string[]) =>
            header.map((h: string) => h.trim().replace(/^\uFEFF/, "")), // trims and removes BOM
          trim: true,
          delimiter: ";",
        })
      )
      .on("data", (row) => {
        // Only pick the required columns
        const obj: BaseProductScrap = {
          sku: row["CODIGO SKU"].toUpperCase(),
          name: row["PRODUCTO"],
          link: "",
          price: 0,
          outOfStock: null,
          image: "",
          brand: row["CATEGORIA"].toUpperCase(),
        };
        records.push(obj);
      })
      .on("end", () => {
        resolve(records);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}
