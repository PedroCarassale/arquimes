interface MateriaLayoutProps {
  materiaId: string;
  materiaName: React.ReactNode;
  materiaInfo?: React.ReactNode;
  immersive?: boolean;
  children: React.ReactNode;
}

export function MateriaLayout({ children }: MateriaLayoutProps) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>;
}
