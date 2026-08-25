import { AccountDataPage } from "../../../components/AccountDataPage";

export default function SellsPage() {
  return (
    <AccountDataPage
      mode="sells"
      title="Sells"
      description="Review sell-side orders currently available from the live Perpl state feed."
    />
  );
}
