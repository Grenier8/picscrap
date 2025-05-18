import * as fs from "fs";
import { parse } from "csv-parse";
import { Product } from "../interfaces";

/**
 * Reads a CSV file and converts it to a JSON array of objects.
 * @param filePath Path to the CSV file
 * @returns Promise<Product[]>
 */
export function csvToJson(filePath: string): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const records: Product[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true, delimiter: ";" }))
      .on("data", (row) => {
        // Only pick the required columns
        const obj: Product = {
          name: row["PRODUCTO"],
          link: "",
          price: "",
          outOfStock: null,
          image: "",
          brand: row["CATEGORIA"],
          sku: row["CODIGO SKU"],
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
