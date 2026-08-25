import { AccountDataPage } from "../../../components/AccountDataPage";

export default function PnlPage() {
  return (
    <AccountDataPage
      mode="pnl"
      title="PnL"
      description="Track position performance from the live Perpl state feed."
    />
  );
}
