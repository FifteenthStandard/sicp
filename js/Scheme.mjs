function makeNumber(value) { return { type: 'number', value: +value }; };
function makeSymbol(value) { return { type: 'symbol', value }; };
function makeString(value) { return { type: 'string', value }; };
function makeList(value) { return { type: 'list', value }; };
function makeProcedure(name, value) { return { type: 'procedure', name, value }; };
function makeBool(value) { return { type: 'symbol', value: !!value ? 'true' : 'false' }; };
function makeVoid() { return { type: 'void' }; };

function parse(source) {
  const expressions = [];
  while (true) {
    const { result, error, value, continueFrom } = parseNext(source);
    switch (result) {
      case 'endOfFile': return expressions;
      case 'endOfList': throw new Error("Error while parsing expression: Unexpected end of list marker ')'");
      case 'error': throw new Error(error);
      case 'success': expressions.push(value);
    }
    source = continueFrom;
  }
};

function parseNext(source) {
  source = source.trimStart();
  if (!source) return { result: 'endOfFile' };
  if (source[0] === ';') return parseComment(source);
  if (source[0] === '"') return parseString(source);
  if (source[0] === '(') return parseList(source);
  if (source[0] === ')') return { result: 'endOfList', continueFrom: source.substring(1) };
  return parseAtom(source);
};

function parseComment(source) {
  if (source[0] !== ';') return { result: 'error', error: "Internal error: Expected start of comment marker ';'" };
  source = source.substring(2); // skip '; '
  let endOfLine = source.indexOf('\n');
  if (endOfLine === -1) endOfLine = source.length;
  const comment = source.substring(0, endOfLine);
  return { result: 'comment', comment, continueFrom: source.substring(endOfLine) };
};

function parseString(source) {
  if (source[0] !== '"') return { result: 'error', error: "Internal error: Expected start of string marker '\"'" };
  source = source.substring(1);
  let endOfString = source.indexOf('"');
  if (endOfString === -1) return { result: 'error', error: "Error while parsing string: Unexpected end of input" };
  const value = source.substring(0, endOfString);
  return { result: 'success', value: makeString(value), continueFrom: source.substring(endOfString+1) };
};

function parseList(source) {
  if (source[0] !== '(') return { result: 'error', error: "Internal error: Expected start of list marker '('" };
  source = source.substring(1);
  const elems = [];
  while (true) {
    const { result, error, value, continueFrom } = parseNext(source);
    switch (result) {
      case 'endOfFile': return { result: 'error', error: "Error while parsing list: Unexpected end of input" };
      case 'endOfList': return { result: 'success', value: makeList(elems), continueFrom };
      case 'error': return { result: 'error', error: `Error while parsing list: ${error}` };
      case 'success': elems.push(value);
    }
    source = continueFrom;
  }
};

function parseAtom(source) {
  source = source.trimStart();
  if (!source) return { result: 'error', error: "Internal error: Unexpected end of input while parsing atom" };
  if (source[0] === '(') return { result: 'error', error: "Internal error: Unexpected start of list marker '(' while parsing atom" };
  if (source[0] === ')') return { result: 'error', error: "Internal error: Unexpected end of list marker ')' while parsing atom" };
  const value = source.match(/^[^\s\(\)]+/)[0];
  const continueFrom = source.substring(value.length);
  return value.match(/^-?\d+(\.\d+)?$/)
    ? { result: 'success', value: makeNumber(value), continueFrom }
    : { result: 'success', value: makeSymbol(value), continueFrom };
};

function evaluate(source, { print } = { print: () => {} }) {
  const expressions = parse(source);
  const environment = GlobalEnvironment({ print });
  const values = expressions
    .map(expression => evaluateIn(expression, environment))
    .map(printExpression);
  
  return values.length === 1 ? values[0] : values;
};

function evaluator({ print } = { print: () => {} }) {
  const environment = GlobalEnvironment({ print });

  return function evaluate(source) {
    const expressions = parse(source);
    const values = [];
    for (const expression of expressions) {
      const value = printExpression(evaluateIn(expression, environment));
      print(`${value}\n`);
      values.push(value);
    }
    return values.length === 1 ? values[0] : values;
  }
};

function evaluateIn(expression, environment) {
  switch (expression.type) {
    case 'number': return expression;
    case 'string': return expression;
    case 'procedure': return expression;
    case 'symbol': return evaluateSymbolIn(expression, environment);
    case 'list': return evaluateListIn(expression, environment);
    default: throw new Error(`Internal error: Unknown expression type '${expression.type}' for expression '${expression}'`);
  }
};

function evaluateSymbolIn(expression, environment) {
  const { value: name } = expression;
  if (!(name in environment)) throw new Error(`Error when evaluating expression: Unbound variable '${name}'`);
  return environment[name];
};

function evaluateListIn(expression, environment) {
  if (expression.type !== 'list') throw new Error(`Internal error: Expected list`);
  if (expression.value.length === 0) throw new Error("Error when evaluating expression: Empty combination is invalid");

  let [operator, ...operands] = expression.value;
  switch (`${operator.type}-${operator.value}`) {
    case 'symbol-define': return evaluateDefine(operands, environment);
    case 'symbol-cond': return evaluateCond(operands, environment);
    case 'symbol-if': return evaluateIf(operands, environment);
    case 'symbol-and': return evaluateAnd(operands, environment);
    case 'symbol-or': return evaluateOr(operands, environment);
    default:
      operator = evaluateIn(operator, environment);
      if (operator.type !== 'procedure')
        throw new Error("Error when evaluating expression: Operator is not a procedure");
      operands = operands.map(operand => evaluateIn(operand, environment));
      return operator.value(operands);
  }
};

function evaluateDefine(operands, environment) {
  const [term, ...expressions] = operands;
  switch (term.type) {
    case 'symbol':
      if (expressions.length !== 1)
        throw new Error("Error when evaluating 'define' expression: Only one value permitted");
      const value = evaluateIn(expressions[0], environment);
      environment[term.value] = value;
      return term;
    case 'list':
      const [name, ...parameters] = term.value;
      if (name.type !== 'symbol')
        throw new Error("Error when evaluating 'define' expression: Procedure name must be symbol");
      const procedure = function (args) {
        if (parameters.length !== args.length)
          throw new Error(`Error when evaluating procedure: ${name.value} expects ${parameters.length} arguments but got ${args.length}`);
        const bindings = parameters.map((parameter, index) => [parameter.value, args[index]]);
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
      environment[name.value] = makeProcedure(name.value, procedure);
      return name;
    default:
      throw new Error("Error when evaluating 'define' expression: Must define a name or a procedure");
  }
};

function evaluateCond(operands, environment) {
  for (const operand of operands) {
    if (operand.type !== 'list')
      throw new Error(`Error when evaluating 'cond' expression: Expected clause to be pair but got ${operand}`);
    const [predicate, expression] = operand.value;
    if (predicate.type === 'symbol' && predicate.value === 'else' || evaluateIn(predicate, environment).value !== 'false')
      return evaluateIn(expression, environment);
  }
};

function evaluateIf(operands, environment) {
  const [predicate, consequent, alternative] = operands;
  return evaluateIn(predicate, environment).value !== 'false'
    ? evaluateIn(consequent, environment)
    : alternative ? evaluateIn(alternative, environment) : makeVoid();
};

function evaluateAnd(operands, environment) {
  for (const operand of operands) {
    if (evaluateIn(operand, environment).value !== 'false') return makeBool(false);
  }
  return makeBool(true);
};

function evaluateOr(operands, environment) {
  for (const operand of operands) {
    if (evaluateIn(operand, environment).value !== 'false') return makeBool(true);
  }
  return makeBool(false);
};

function printExpression(expression) {
  switch (expression.type) {
    case 'number': return expression.value.toString();
    case 'string': return expression.value;
    case 'procedure': return expression.name;
    case 'symbol': return expression.value;
    case 'list': return `(${expression.value.map(printExpression).join(' ')})`;
    case 'void': return '';
  }
};

const GlobalEnvironment = ({ print }) => ({
  '+': makeProcedure('+', ([first, ...rest]) => makeNumber(rest.reduce((result, operand) => result + operand.value, first.value))),
  '-': makeProcedure('-', ([first, ...rest]) => makeNumber(rest.length === 0 ? -first.value : rest.reduce((result, operand) => result - operand.value, first.value))),
  '*': makeProcedure('*', ([first, ...rest]) => makeNumber(rest.reduce((result, operand) => result * operand.value, first.value))),
  '/': makeProcedure('/', ([first, ...rest]) => makeNumber(rest.reduce((result, operand) => result / operand.value, first.value))),
  '=': makeProcedure('=', ([first, second]) => makeBool(first.value === second.value)),
  '<': makeProcedure('<', ([first, second]) => makeBool(first.value < second.value)),
  '>': makeProcedure('>', ([first, second]) => makeBool(first.value > second.value)),
  'inc': makeProcedure('inc', ([n]) => makeNumber(n.value + 1)),
  'dec': makeProcedure('dec', ([n]) => makeNumber(n.value - 1)),
  'remainder': makeProcedure('remainer', ([dividend, divisor]) => makeNumber(dividend.value % divisor.value)),
  'display': makeProcedure('display', ([expr]) => makeVoid(print(printExpression(expr)))),
  'newline': makeProcedure('newline', () => makeVoid(print('\n'))),
  'runtime': makeProcedure('runtime', () => makeNumber(Date.now())),
  'random': makeProcedure('random', ([n]) => makeNumber(Math.floor(Math.random() * n.value))),
  'true': makeBool(true),
  'false': makeBool(false),
});

export {
  evaluate,
  evaluator,
};
