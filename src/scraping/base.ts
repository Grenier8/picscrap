import { upsertBaseProducts } from "../api/base-products";
import { BaseProductDB, Brand } from "../interfaces";
import { csvToJson } from "../utils/csvUtils";
import { saveProductsToFile } from "../utils/fileManager";

export async function loadBaseProducts() {
  const baseProducts = await csvToJson("./csv/picslab-products.csv");

  if (process.env.NODE_ENV === "development") {
    saveProductsToFile(baseProducts, 0);
  }

  await upsertBaseProducts(
    baseProducts.map(
      (product) =>
        ({
          ...product,
          Brand: {
            name: product.brand?.toUpperCase(),
          } as Brand,
        } as BaseProductDB)
    )
  );
}
