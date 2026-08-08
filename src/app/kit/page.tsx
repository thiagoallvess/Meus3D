"use client";

import AppLayout from "@/components/AppLayout";
import Calculator from "@/components/Calculator";

export default function KitCalculatorPage() {
  return (
    <AppLayout title="Calculadora de Kits" subtitle="Impressão 3D">
      <Calculator isKit={true} />
    </AppLayout>
  );
}
