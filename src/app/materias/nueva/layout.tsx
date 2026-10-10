import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nueva materia" };

export default function NuevaMateriaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
