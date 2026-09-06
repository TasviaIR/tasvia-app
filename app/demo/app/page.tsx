import type { Metadata } from "next";
import { FinancialDemo } from "../../../src/components/demo/financial-demo";

export const metadata: Metadata = {
  title: "دموی محیط مالی تسوین",
  description: "دموی تعاملی و امن محیط مالی و حسابداری تسوین با داده‌های ساختگی.",
  robots: { index: false, follow: false },
};

export default function DemoFinancialWorkspacePage() {
  return <FinancialDemo />;
}
