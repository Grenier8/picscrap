import { imageHash } from "image-hash";
import fs from "fs";
import { promisify } from "util";

const getImageHash = promisify(imageHash) as (
  path: string,
  bits?: number,
  method?: boolean
) => Promise<string>;

function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error("Hashes must be of the same length");
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

export async function compareImageHashes(
  path1: string,
  path2: string
): Promise<number> {
  if (!path1 || !path2) {
    return 0;
  }
  try {
    const hash1 = await getImageHash(path1, 16, false); // true = phash
    const hash2 = await getImageHash(path2, 16, false);

    const distance = hammingDistance(hash1, hash2);
    const similarity = 1 - distance / hash1.length;
    return similarity;
  } catch (error) {
    console.error("Error comparing images:", error);
    return 0;
  }
}

export async function findMostSimilarImage(
  mainPath: string,
  paths: string[]
): Promise<string | null> {
  if (paths.length === 0) return null;

  try {
    const mainHash = await getImageHash(mainPath, 16, false);

    let bestMatch: string | null = null;
    let lowestDistance = Number.MAX_SAFE_INTEGER;

    for (const path of paths) {
      try {
        const hash = await getImageHash(path, 16, false);
        const distance = hammingDistance(mainHash, hash);

        if (distance < lowestDistance) {
          lowestDistance = distance;
          bestMatch = path;
        }
      } catch (error) {
        console.warn(`Could not hash image at path "${path}":`, error);
      }
    }

    return bestMatch;
  } catch (error) {
    console.error("Failed to process main image:", error);
    return null;
  }
}

export async function getImageSimilarity(
  path1: string,
  path2: string
): Promise<number> {
  if (!path1 || !path2) {
    return 0;
  }
  return await compareImageHashes(path1, path2);
}

export function getFastImageSimilarity(imgA: string, imgB: string): number {
  if (!imgA || !imgB) return 0;
  // Placeholder: compare base64 length difference, normalized
  const lenA = imgA.length;
  const lenB = imgB.length;
  const diff = Math.abs(lenA - lenB);
  const maxLen = Math.max(lenA, lenB);
  return maxLen === 0 ? 0 : 1 - diff / maxLen;
}
