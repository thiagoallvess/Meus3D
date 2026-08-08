"use client";

import AppLayout from "@/components/AppLayout";
import Calculator from "@/components/Calculator";

export default function CalculatorPage() {
  return (
    <AppLayout title="Calculadora de Precificação" subtitle="Impressão 3D">
      <Calculator isKit={false} />
    </AppLayout>
  );
}
