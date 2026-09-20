import { AppError } from "../http";
export function stockAfterAdjustment(current: number, delta: number) { if (!Number.isInteger(current) || !Number.isInteger(delta) || delta === 0) throw new AppError(400, "Inventory adjustment must be a non-zero whole number."); const result = current + delta; if (result < 0) throw new AppError(409, "Inventory cannot become negative."); return result; }
