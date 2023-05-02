function parse(source) {
  const expressions = [];
  while (true) {
    const { end, endOfList, error, result, continueFrom } = parseNext(source);
    if (end) return expressions;
    if (error) throw new Error(error);
    if (endOfList) throw new Error("Error while parsing expression: Unexpected end of list marker ')'");
    if (result) expressions.push(result);
    source = continueFrom;
  }
};

function parseNext(source) {
  source = source.trimStart();
  if (!source) return { end: true };
  if (source[0] === ';') return parseComment(source);
  if (source[0] === '(') return parseList(source);
  if (source[0] === ')') return { endOfList: true, continueFrom: source.substring(1) };
  return parseAtom(source);
};

function parseComment(source) {
  if (source[0] !== ';') return { error: "Internal error: Expected start of comment marker ';'" };
  source = source.substring(2); // skip '; '
  let endOfLine = source.indexOf('\n');
  if (endOfLine === -1) endOfLine = source.length;
  const comment = source.substring(0, endOfLine);
  return { comment, continueFrom: source.substring(endOfLine) };
};

function parseList(source) {
  if (source[0] !== '(') return { error: "Internal error: Expected start of list marker '('" };
  source = source.substring(1);
  const elems = [];
  while (true) {
    const { end, endOfList, error, result, continueFrom } = parseNext(source);
    if (error) return { error: `Error while parsing list: ${error}` };
    if (end) return { error: "Error while parsing list: Unexpected end of input" };
    if (endOfList) return { result: elems, continueFrom };
    if (result) elems.push(result);
    source = continueFrom;
  }
};

function parseAtom(source) {
  source = source.trimStart();
  if (!source) return { error: "Internal error: Unexpected end of input while parsing atom" };
  if (source[0] === '(') return { error: "Internal error: Unexpected start of list marker '(' while parsing atom" };
  if (source[0] === '(') return { error: "Internal error: Unexpected end of list marker ')' while parsing atom" };
  const result = source.match(/^[^\s\(\)]+/)[0];
  const continueFrom = source.substring(result.length);
  return { result, continueFrom };
};

function evaluate(source) {
  const expressions = parse(source);
  const environment = GlobalEnvironment();
  const values = expressions
    .map(expression => evaluateIn(expression, environment))
    .map(printExpression);
  
  return values.length === 1 ? values[0] : values;
};

function evaluator() {
  const environment = GlobalEnvironment();

  return function evaluate(source) {
    const expressions = parse(source);
    const values = expressions
      .map(expression => evaluateIn(expression, environment))
      .map(printExpression);

    return values.length === 1 ? values[0] : values;
  }
};

function expressionIsAtom(expression) {
  return typeof(expression) === 'string' || typeof(expression) === 'number' || typeof(expression) === 'boolean';
};

function expressionIsList(expression) {
  return Array.isArray(expression);
};

function expressionIsProcedure(expression) {
  return typeof(expression) === 'function';
};

function expressionIsEmpty(expression) {
  return expression === undefined;
};

function evaluateIn(expression, environment) {
  if (expressionIsAtom(expression)) {
    return evaluateAtomIn(expression, environment);
  } else if (expressionIsList(expression)) {
    return evaluateListIn(expression, environment);
  } else {
    throw new Error(`Internal error: Unknown expression '${expression}'`);
  }
};

function evaluateAtomIn(expression, environment) {
  if (expression.match(/^-?\d+(\.\d+)?$/)) return +expression;
  if (!(expression in environment)) throw new Error(`Error when evaluating expression: Unbound variable '${expression}'`);
  return environment[expression];
};

function evaluateListIn(expression, environment) {
  if (expression.length === 0) throw new Error("Error when evaluating expression: Empty combination is invalid");

  let [operator, ...operands] = expression;
  switch (operator) {
    case 'define': return evaluateDefine(operands, environment);
    case 'cond': return evaluateCond(operands, environment);
    case 'if': return evaluateIf(operands, environment);
    case 'and': return evaluateAnd(operands, environment);
    case 'or': return evaluateOr(operands, environment);
    default:
      operator = evaluateIn(operator, environment);
      operands = operands.map(operand => evaluateIn(operand, environment));
      return operator(operands);
  }
};

function evaluateDefine(operands, environment) {
  const [definitionName, ...expressions] = operands;
  if (expressionIsAtom(definitionName)) {
    if (expressions.length !== 1) throw new Error("Error when evaluating 'define' expression: Only one value permitted");
    const value = evaluateIn(expressions[0], environment);
    environment[definitionName] = value;
    return definitionName;
  } else if (expressionIsList(definitionName)) {
    const [procedureName, ...parameters] = definitionName;
    const procedure = function (args) {
      if (parameters.length !== args.length) throw new Error(`Error when evaluating procedure: ${procedureName} expects ${parameters.length} arguments but got ${args.length}`);
      const bindings = parameters.map((parameter, index) => [parameter, args[index]]);
      var activationRecord = {
        ...environment,
        ...Object.fromEntries(bindings),
      };
      let value;
      for (const expression of expressions) {
        value = evaluateIn(expression, activationRecord);
      }
      return value;
    };
    environment[procedureName] = procedure;
    return procedureName;
  } else {
    throw new Error('Error when evaluating \'define\' expression: Must define a name or a procedure');
  }
};

function evaluateCond(operands, environment) {
  for (const operand of operands) {
    const [predicate, expression] = operand;
    if (predicate === 'else') return evaluateIn(expression, environment);
    if (evaluateIn(predicate, environment)) return evaluateIn(expression, environment);
  }
};

function evaluateIf(operands, environment) {
  const [predicate, consequent, alternative] = operands;
  return evaluateIn(predicate, environment)
    ? evaluateIn(consequent, environment)
    : evaluateIn(alternative, environment);
};

function evaluateAnd(operands, environment) {
  for (const operand of operands) {
    if (!evaluateIn(operand, environment)) return false;
  }
  return true;
};

function evaluateOr(operands, environment) {
  for (const operand of operands) {
    if (evaluateIn(operand, environment)) return true;
  }
  return false;
};

function printExpression(expression) {
  if (expressionIsAtom(expression)) {
    return printAtom(expression);
  } else if (expressionIsList(expression)) {
    return printList(expression);
  } else if (expressionIsProcedure(expression)) {
    return printProcedure(expression);
  } else if (expressionIsEmpty) {
    return printEmpty(expression);
  } else {
    throw new Error(`Internal error: Unknown expression '${expression}'`);
  }
};

function printAtom(expression) {
  return expression.toString();
};

function printList(expression) {
  return `(${expression.map(printExpression).join(' ')})`;
};

function printProcedure() {
  return 'Primitive procedure';
};

function printEmpty() {
  return null;
};

const GlobalEnvironment = () => ({
  '+': ([first, ...rest]) => rest.reduce((result, operand) => result + operand, first),
  '-': ([first, ...rest]) => rest.length === 0 ? -first : rest.reduce((result, operand) => result - operand, first),
  '*': ([first, ...rest]) => rest.reduce((result, operand) => result * operand, first),
  '/': ([first, ...rest]) => rest.reduce((result, operand) => result / operand, first),
  '=': ([first, second]) => first === second,
  '<': ([first, second]) => first < second,
  '>': ([first, second]) => first > second,
  'inc': ([n]) => n + 1,
  'dec': ([n]) => n - 1,
  'remainder': ([dividend, divisor]) => dividend % divisor,
});

export {
  evaluate,
  evaluator,
};
