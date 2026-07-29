const MORTGAGE = 2000;

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

/** A resident counted as active for the viewed period — see isActiveForPeriod. */
export interface ManagementTenant {
  name: string;
  rentAmount: number | null;
  utilityShare: number;
}

export function calcGross(bill: UtilityBill | null, tenants: ManagementTenant[] = []) {
  const totalUtil = bill ? bill.electric + bill.gas + bill.water + bill.wifi : 0;
  const totalShares = tenants.reduce((sum, t) => sum + t.utilityShare, 0);

  const expenses: Row[] = [
    { label: "Mortgage", sign: "-", amount: MORTGAGE },
    { label: "Electric", sign: "-", amount: bill?.electric ?? 0 },
    { label: "Gas", sign: "-", amount: bill?.gas ?? 0 },
    { label: "Water", sign: "-", amount: bill?.water ?? 0 },
    { label: "WiFi", sign: "-", amount: bill?.wifi ?? 0 },
  ];

  const incomes: Row[] = tenants.flatMap((t) => {
    const rows: Row[] = [];
    if (t.rentAmount) rows.push({ label: `${t.name} — Rent`, sign: "+", amount: t.rentAmount });
    if (t.utilityShare > 0 && totalShares > 0) {
      rows.push({
        label: `${t.name} — Utils ${t.utilityShare}/${totalShares}`,
        sign: "+",
        amount: totalUtil * (t.utilityShare / totalShares),
      });
    }
    return rows;
  });

  const rows = [...incomes, ...expenses];
  const gross = rows.reduce((sum, r) => (r.sign === "+" ? sum + r.amount : sum - r.amount), 0);
  return { rows, gross, expenses, totalShares };
}

export const MORTGAGE_AMOUNT = MORTGAGE;
