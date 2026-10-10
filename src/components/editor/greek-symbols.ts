import { InputRule } from "@milkdown/kit/prose/inputrules";
import { $inputRule } from "@milkdown/kit/utils";
import { LEAF_TEXT, findSymbolTrigger } from "@/lib/greek-symbols";

export const greekSymbols = $inputRule(
  () =>
    new InputRule(
      /[\\/][A-Za-zÁÉÍÓÚáéíóú]+([ ,.;:!?)\]}])$/,
      (state, match, start, end) => {
        const $start = state.doc.resolve(start);
        if (!$start.parent.isTextblock || $start.parent.type.spec.code) return null;
        const before = $start.parent.textBetween(0, $start.parentOffset, undefined, LEAF_TEXT);
        const trigger = findSymbolTrigger(before + match[0].slice(0, -match[1].length));
        if (!trigger || trigger.start !== before.length) return null;
        return state.tr.insertText(`${trigger.symbol}${match[1]}`, start, end);
      },
      { inCodeMark: false }
    )
);
