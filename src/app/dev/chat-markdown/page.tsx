import { notFound } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";

const brokenDelimiterFixture = String.raw`# Bloque 1: Propagación de errores y método directo

## Qué problema quiere resolver el apunte

El apunte parte de una situación muy común en análisis numérico: tenemos una función

$$
u = f(x_1,x_2,\dots,x_n)$$

(donde en el apunte la variable dependiente aparece como $u$ o también como $y$ en la parte del método inverso), y las variables $x_1, x_2, \dots, x_n$ son datos de entrada.

Entonces la pregunta es:

**Si los datos de entrada tienen error, cuánto error tendría el resultado final?**

Esa idea es la **propagación de errores**.

---

## Planteo general`;

const wellFormedFixture = String.raw`# Mensaje con varias fórmulas

La forma inline clásica es $u = f(x_1, x_2)$ y también aceptamos \(y = g(t)\).

$$
\Delta u \approx \sum_{i=1}^{n}\left|\frac{\partial f}{\partial x_i}\right|\Delta x_i
$$

## Resultado

La **cota de error** combina todos los términos y conserva el formato posterior.

---

Fin del mensaje.`;

const invalidKatexFixture = String.raw`# Error de KaTeX aislado

La fórmula siguiente es inválida a propósito:

$$
\frac{1}{
$$

## El documento continúa

Este texto conserva **negrita**, estructura y un $precio literal aunque KaTeX falle.

---

Fin seguro.`;

export default function ChatMarkdownHarnessPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8 border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
          Harness de desarrollo
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">
          Chat Markdown
        </h1>
        <p className="mt-2 max-w-3xl text-foreground-muted">
          Fixtures permanentes para delimitadores LaTeX rotos y mensajes con
          varias fórmulas.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <FixtureCard
          id="broken-delimiter"
          title="Delimitador roto de Pedro"
          description="Patrón exacto: una fórmula sin apertura termina en $$."
          content={brokenDelimiterFixture}
        />
        <FixtureCard
          id="well-formed"
          title="Mensaje bien formado"
          description="Mezcla fórmulas inline, delimitadores \\(…\\) y bloque $$."
          content={wellFormedFixture}
        />
        <FixtureCard
          id="invalid-katex"
          title="KaTeX inválido aislado"
          description="La fórmula falla sin convertir el resto en código."
          content={invalidKatexFixture}
        />
      </div>
    </main>
  );
}

function FixtureCard({
  id,
  title,
  description,
  content,
}: {
  id: string;
  title: string;
  description: string;
  content: string;
}) {
  return (
    <section
      data-testid={`fixture-${id}`}
      className="rounded-xl border border-border bg-surface p-5 shadow-2xl shadow-black/10"
    >
      <div className="mb-5 border-b border-border-subtle pb-4">
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      </div>
      <ChatMarkdown>{content}</ChatMarkdown>
    </section>
  );
}
