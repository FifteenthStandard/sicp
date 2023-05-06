import { evaluator } from "./Scheme.mjs";

window.addEventListener('load', function () {
  const editors = document.querySelectorAll('textarea');
  for (const editor of editors) {
    editor.rows = editor.value.split('\n').length;
    const name = editor.name;
    const output = document.querySelector(`output[for="${name}"]`);
    function getExtendsNames(elem) {
      const extendsNamesStr = elem.dataset.extends;
      return extendsNamesStr ? extendsNamesStr.split(/\s/) : [];
    }
    const yetToExtend = getExtendsNames(editor);
    const extendsElems = [];
    while (yetToExtend.length) {
      const name = yetToExtend.pop();
      const elem = document.querySelector(`textarea[name="${name}"]`);
      extendsElems.unshift(elem);
      yetToExtend.push(...getExtendsNames(elem));
    }
    if (output) {
      editor.oninput = function () {
        editor.rows = editor.value.split('\n').length;
        const evaluate = evaluator();
        try {
          for (const elem of extendsElems) {
            evaluate(elem.value);
          }
          const result = evaluate(editor.value);
          output.value = (Array.isArray(result)
            ? result.filter(line => line).join('\n')
            : result)
            || '\u200B';
        } catch (error) {
          output.value = error.message;
        }
      };
    }
  }
});
