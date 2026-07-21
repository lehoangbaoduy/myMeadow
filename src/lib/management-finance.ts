const MORTGAGE = 2000;

const RENT = {
  duongNgan: 600,
  cuong: 500,
  khaoThao: 550,
};

// Updated: Nhi = 0.5 shares → total = 6.5
const TOTAL_SHARES = 6.5;
const UTILITY_SHARES = {
  duongNgan: 2 / TOTAL_SHARES,
  cuong: 1 / TOTAL_SHARES,
  khaoThao: 2 / TOTAL_SHARES, // Khoa + Thảo = 2
  bao: 1 / TOTAL_SHARES,
  nhi: 0.5 / TOTAL_SHARES,
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const PIE_COLORS = ["#F97316", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"];

export interface UtilityBill {
  month: number;
  year: number;
  electric: number;
  gas: number;
  water: number;
  wifi: number;
}

export interface Row {
  label: string;
  sign: "+" | "-";
  amount: number;
}

export function calcGross(bill: UtilityBill | null) {
  const totalUtil = bill ? bill.electric + bill.gas + bill.water + bill.wifi : 0;

  const expenses: Row[] = [
    { label: "Mortgage", sign: "-", amount: MORTGAGE },
    { label: "Electric", sign: "-", amount: bill?.electric ?? 0 },
    { label: "Gas", sign: "-", amount: bill?.gas ?? 0 },
    { label: "Water", sign: "-", amount: bill?.water ?? 0 },
    { label: "WiFi", sign: "-", amount: bill?.wifi ?? 0 },
  ];

  const incomes: Row[] = [
    { label: "Dương & Ngân — Rent", sign: "+", amount: RENT.duongNgan },
    { label: "Dương & Ngân — Utils 2/6.5", sign: "+", amount: totalUtil * UTILITY_SHARES.duongNgan },
    { label: "Cường — Rent", sign: "+", amount: RENT.cuong },
    { label: "Cường — Utils 1/6.5", sign: "+", amount: totalUtil * UTILITY_SHARES.cuong },
    { label: "Khoa & Thảo — Rent", sign: "+", amount: RENT.khaoThao },
    { label: "Khoa & Thảo — Utils 2/6.5", sign: "+", amount: totalUtil * UTILITY_SHARES.khaoThao },
  ];

  const rows = [...incomes, ...expenses];
  const gross = rows.reduce((sum, r) => (r.sign === "+" ? sum + r.amount : sum - r.amount), 0);
  return { rows, gross, expenses };
}

export const MORTGAGE_AMOUNT = MORTGAGE;
