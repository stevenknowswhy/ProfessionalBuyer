import type { Metadata } from "next";
import { BuyerApp } from "./buyer-app";

export const metadata: Metadata = { title: { absolute: "Genie" } };

export default function AppPage() {
  return <BuyerApp />;
}
