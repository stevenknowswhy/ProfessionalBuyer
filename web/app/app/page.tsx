import type { Metadata } from "next";
import { BuyerApp } from "./buyer-app";

export const metadata: Metadata = { title: "Buyer" };

export default function AppPage() {
  return <BuyerApp />;
}
