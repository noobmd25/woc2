import Footer from "@/components/Footer";
import SimpleHeader from "@/components/SimpleHeader";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <SimpleHeader />
      <main className="max-w-md mx-auto py-16 px-4">{children}</main>
      <Footer />
    </div>
  );
}
