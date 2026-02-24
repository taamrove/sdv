import { prisma } from "./prisma";

/**
 * Get the next sequential number for a Product (template) within a category.
 */
export async function getNextProductNumber(categoryId: string): Promise<number> {
  const lastProduct = await prisma.product.findFirst({
    where: { categoryId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (lastProduct?.number ?? 0) + 1;
}

/**
 * Get the next sequence number for an Item (physical copy) within a Product.
 */
export async function getNextItemSequence(productId: string): Promise<number> {
  const lastItem = await prisma.item.findFirst({
    where: { productId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (lastItem?.sequence ?? 0) + 1;
}

/**
 * Build a human-readable ID in the format: CategoryCode-ProductNumber-ItemSequence
 * e.g. "C-001-001" for first item of first costume product.
 */
export function buildHumanReadableId(
  categoryCode: string,
  productNumber: number,
  itemSequence: number
): string {
  const y = String(productNumber).padStart(3, "0");
  const z = String(itemSequence).padStart(3, "0");
  return `${categoryCode}-${y}-${z}`;
}

/**
 * Parse a human-readable ID back into its components.
 * Format: CategoryCode-ProductNumber-ItemSequence (e.g. "C-001-001")
 */
export function parseHumanReadableId(humanId: string) {
  const match = humanId.match(/^([A-Z])-(\d{3})-(\d{3})$/);
  if (!match) return null;
  return {
    categoryCode: match[1],
    productNumber: parseInt(match[2], 10),
    itemSequence: parseInt(match[3], 10),
  };
}
