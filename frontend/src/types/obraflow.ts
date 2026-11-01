export type Screen = 'new-order' | 'approvals' | 'rules';
export type Option = { id: number; name: string };
export type Order = {
  id: number;
  status: string;
  orderDate: string;
  totalCents: number;
  work: string;
  supplier: string;
};
export type Rule = {
  id: number;
  minimumTotalCents: number;
  maximumTotalCents: number | null;
  approvers: { userId: number; userName: string; position: number }[];
};
export type OrderItem = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};
