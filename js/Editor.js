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
      let outputStr;
      let silent;
      const print = function (expr) {
        if (!silent) outputStr += expr;
      };
      editor.oninput = function () {
        outputStr = '';
        editor.rows = editor.value.split('\n').length;
        const evaluate = evaluator({ print });
        try {
          silent = true;
          for (const elem of extendsElems) {
            evaluate(elem.value);
          }
          silent = false;
          evaluate(editor.value);
        } catch (error) {
          print(error.message);
        }
        if (!outputStr) outputStr = '\u200B';
        output.value = outputStr.trim();
      };
    }
  }
});
