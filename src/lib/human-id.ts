import { prisma } from "./prisma";

export async function getNextItemNumber(categoryId: string): Promise<number> {
  const lastItem = await prisma.item.findFirst({
    where: { categoryId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (lastItem?.number ?? 0) + 1;
}

export async function getNextPieceSequence(itemId: string): Promise<number> {
  const lastPiece = await prisma.piece.findFirst({
    where: { itemId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (lastPiece?.sequence ?? 0) + 1;
}

export function buildHumanReadableId(
  categoryCode: string,
  itemNumber: number,
  pieceSequence: number
): string {
  const y = String(itemNumber).padStart(3, "0");
  const z = String(pieceSequence).padStart(3, "0");
  return `${categoryCode}-${y}-${z}`;
}

export function parseHumanReadableId(humanId: string) {
  const match = humanId.match(/^([A-Z])-(\d{3})-(\d{3})$/);
  if (!match) return null;
  return {
    categoryCode: match[1],
    itemNumber: parseInt(match[2], 10),
    pieceSequence: parseInt(match[3], 10),
  };
}
