const LETRAS: [string, string][] = [
  ["alpha", "α"],
  ["alfa", "α"],
  ["beta", "β"],
  ["gamma", "γ"],
  ["delta", "δ"],
  ["epsilon", "ϵ"],
  ["épsilon", "ε"],
  ["zeta", "ζ"],
  ["dseta", "ζ"],
  ["eta", "η"],
  ["theta", "θ"],
  ["tita", "θ"],
  ["iota", "ι"],
  ["kappa", "κ"],
  ["kapa", "κ"],
  ["cappa", "κ"],
  ["lambda", "λ"],
  ["lamda", "λ"],
  ["mu", "μ"],
  ["mi", "μ"],
  ["nu", "ν"],
  ["ni", "ν"],
  ["xi", "ξ"],
  ["omicron", "ο"],
  ["ómicron", "ο"],
  ["pi", "π"],
  ["rho", "ρ"],
  ["ro", "ρ"],
  ["sigma", "σ"],
  ["tau", "τ"],
  ["upsilon", "υ"],
  ["ipsilon", "υ"],
  ["ípsilon", "υ"],
  ["phi", "ϕ"],
  ["fi", "φ"],
  ["chi", "χ"],
  ["ji", "χ"],
  ["psi", "ψ"],
  ["omega", "ω"],
];

const VARIANTES: [string, string][] = [
  ["varepsilon", "ε"],
  ["vartheta", "ϑ"],
  ["varphi", "φ"],
  ["varpi", "ϖ"],
  ["varrho", "ϱ"],
  ["varsigma", "ς"],
  ["varkappa", "ϰ"],
];

const SIMBOLOS: [string, string][] = [
  ["infty", "∞"],
  ["infinito", "∞"],
  ["pm", "±"],
  ["to", "→"],
  ["rightarrow", "→"],
  ["leq", "≤"],
  ["le", "≤"],
  ["geq", "≥"],
  ["ge", "≥"],
  ["neq", "≠"],
  ["ne", "≠"],
  ["approx", "≈"],
  ["in", "∈"],
  ["forall", "∀"],
  ["exists", "∃"],
  ["partial", "∂"],
  ["nabla", "∇"],
  ["times", "×"],
  ["cdot", "·"],
];

function capitalizar(nombre: string): string {
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

function construir(): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const [nombre, simbolo] of LETRAS) {
    mapa.set(nombre, simbolo);
    mapa.set(capitalizar(nombre), simbolo.toUpperCase());
  }
  for (const [nombre, simbolo] of [...VARIANTES, ...SIMBOLOS]) mapa.set(nombre, simbolo);
  return mapa;
}

export const SYMBOLS: ReadonlyMap<string, string> = construir();

export function symbolFor(name: string): string | null {
  return SYMBOLS.get(name) ?? null;
}

export function insideOpenSpan(text: string): boolean {
  const limpio = text.replace(/\\[$`]/g, "");
  let abierto: string | null = null;
  for (let i = 0; i < limpio.length; ) {
    const char = limpio[i];
    if (char !== "$" && char !== "`") {
      i++;
      continue;
    }
    let fin = i;
    while (limpio[fin] === char && (char === "`" || fin - i < 2)) fin++;
    const delimitador = limpio.slice(i, fin);
    i = fin;
    if (!abierto) abierto = delimitador;
    else if (abierto === delimitador) abierto = null;
  }
  return abierto !== null;
}

export const LEAF_TEXT = String.fromCharCode(0xfffc);

export type SymbolTrigger = { start: number; end: number; name: string; symbol: string };

const TRIGGER = /(^|[\s([{¿¡"'«“‘\ufffc])([\\/])([A-Za-zÁÉÍÓÚáéíóú]+)$/;

export function findSymbolTrigger(textBefore: string): SymbolTrigger | null {
  const match = TRIGGER.exec(textBefore);
  if (!match) return null;
  const symbol = symbolFor(match[3]);
  if (!symbol) return null;
  const start = match.index + match[1].length;
  if (insideOpenSpan(textBefore.slice(0, start))) return null;
  return { start, end: textBefore.length, name: match[3], symbol };
}
