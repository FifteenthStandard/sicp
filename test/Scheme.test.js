import { evaluate, evaluator } from '../js/Scheme';

describe('1. Building Abstractions with Procedures', () => {
  describe('1.1 The Elements of Programming', () => {
    describe('1.1.1 Expressions', () => {
      test('Numeric literal', () => {
        expect(evaluate('486')).toBe('486');
      });

      test('Binary operations', () => {
        expect(evaluate('(+ 137 349)')).toBe('486');
        expect(evaluate('(- 1000 334)')).toBe('666');
        expect(evaluate('(* 5 99)')).toBe('495');
        expect(evaluate('(/ 10 5)')).toBe('2');
        expect(evaluate('(+ 2.7 10)')).toBe('12.7');
      });

      test('Higher arity', () => {
        expect(evaluate('(+ 21 35 12 7)')).toBe('75');
        expect(evaluate('(* 25 4 12)')).toBe('1200');
      });

      test('Nested operations', () => {
        expect(evaluate('(+ (* 3 5) (- 10 6))')).toBe('19');
      });

      test('Deeply nested operations', () => {
        expect(evaluate('(+ (* 3 (+ (* 2 4) (+ 3 5))) (+ (- 10 7) 6))')).toBe('57');
        expect(evaluate(`
          (+ (* 3
                (+ (* 2 4)
                  (+ 3 5)))
            (+ (- 10 7)
                6))
        `)).toBe('57');
      });
    });

    describe('1.1.2 Naming and the Environment', () => {
      test('Define', () => {
        expect(evaluate('(define size 2)')).toBe('size');
      });

      test('Using a definition', () => {
        const evaluate = evaluator();
        evaluate('(define size 2)');
        expect(evaluate('size')).toBe('2');
        expect(evaluate('(* 5 size)')).toBe('10');
      });

      test('Further examples', () => {
        const evaluate = evaluator();
        expect(evaluate('(define pi 3.14159)')).toBe('pi');
        expect(evaluate('(define radius 10)')).toBe('radius');
        expect(evaluate('(* pi (* radius radius))')).toBe('314.159');
        expect(evaluate('(define circumference (* 2 pi radius))')).toBe('circumference');
        expect(evaluate('circumference')).toBe('62.8318');
      });
    });

    describe('1.1.3 Evaluating Combinations', () => {
      test('Deeply nested combination', () => {
        expect(evaluate(`
          (* (+ 2 (* 4 6))
             (+ 3 5 7))
        `)).toBe('390');
      });
    });

    describe('1.1.4 Compound Procedures', () => {
      test('Procedure definition', () => {
        expect(evaluate('(define (square x) (* x x))')).toBe('square');
      });

      test('Procedure usage', () => {
        const evaluate = evaluator();
        evaluate('(define (square x) (* x x))');
        expect(evaluate('(square 21)')).toBe('441');
        expect(evaluate('(square (+ 2 5))')).toBe('49');
        expect(evaluate('(square (square 3))')).toBe('81');
      });

      test('Using procedures in combinations', () => {
        const evaluate = evaluator();
        evaluate('(define (square x) (* x x))');
        evaluate('(define (sum-of-squares x y) (+ (square x) (square y)))');
        expect(evaluate('(sum-of-squares 3 4)')).toBe('25');
        evaluate('(define (f a) (sum-of-squares (+ a 1) (* a 2)))');
        expect(evaluate('(f 5)')).toBe('136');
      });
    });

    describe('1.1.5 The Substitution Model for Procedure Application', () => {
      test('Expanding a compound procedure', () => {
        const evaluate = evaluator();
        evaluate('(define (square x) (* x x))');
        evaluate('(define (sum-of-squares x y) (+ (square x) (square y)))');
        evaluate('(define (f a) (sum-of-squares (+ a 1) (* a 2)))');
        expect(evaluate('(f 5)')).toBe('136');
        expect(evaluate('(sum-of-squares (+ 5 1) (* 5 2))')).toBe('136');
        expect(evaluate('(+ (square 6) (square 10))')).toBe('136');
        expect(evaluate('(+ (* 6 6) (* 10 10))')).toBe('136');
        expect(evaluate('(+ 36 100)')).toBe('136');
      });
    });

    describe('1.1.6 Conditional Expressions and Predicates', () => {
      test('Using cond expression', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (abs x)
            (cond ((> x 0) x)
                  ((= x 0) 0)
                  ((< x 0) (- x))))
        `);
        expect(evaluate('(abs -1)')).toBe('1');
        expect(evaluate('(abs 1)')).toBe('1');
        expect(evaluate('(abs 0)')).toBe('0');

        evaluate(`
          (define (abs x)
            (cond ((< x 0) (- x))
                  (else x)))
        `);
        expect(evaluate('(abs -1)')).toBe('1');
        expect(evaluate('(abs 1)')).toBe('1');
        expect(evaluate('(abs 0)')).toBe('0');

        evaluate(`
          (define (abs x)
            (if (< x 0)
                (- x)
                x))
        `);
        expect(evaluate('(abs -1)')).toBe('1');
        expect(evaluate('(abs 1)')).toBe('1');
        expect(evaluate('(abs 0)')).toBe('0');
      });

      test('Exercise 1.1', () => {
        const evaluate = evaluator();
        expect(evaluate('10')).toBe('10');
        expect(evaluate('(+ 5 3 4)')).toBe('12');
        expect(evaluate('(- 9 1)')).toBe('8');
        expect(evaluate('(/ 6 2)')).toBe('3');
        expect(evaluate('(+ (* 2 4) (- 4 6))')).toBe('6');
        expect(evaluate('(define a 3)')).toBe('a');
        expect(evaluate('(define b (+ a 1))')).toBe('b');
        expect(evaluate('(+ a b (* a b))')).toBe('19');
        expect(evaluate('(= a b)')).toBe('#f');
        expect(evaluate(`
          (if (and (> b a) (< b (* a b)))
              b
              a)
        `)).toBe('4');
        expect(evaluate(`
          (cond ((= a 4) 6)
                ((= b 4) (+ 6 7 a))
                (else 25))
        `)).toBe('16');
        expect(evaluate('(+ 2 (if (> b a) b a))')).toBe('6');
        expect(evaluate(`(* (cond ((> a b) a)
                  ((< a b) b)
                  (else -1))
            (+ a 1))`)).toBe('16');
      });

      test('Exercise 1.2', () => {
        expect(evaluate(`
          (/ (+ 5
                4
                (- 2
                   (- 3
                      (+ 6 (/ 4 5)))))
             (* 3 (- 6 2) (- 2 7)))
        `)).toBe('-0.24666666666666667');
      });

      test('Exercise 1.3', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (sum-of-largest-two a b c)
            (if (< a b)
                (+ b (if (< a c) c a))
                (+ a (if (< b c) c b))))
        `);
        expect(evaluate('(sum-of-largest-two 1 2 3)')).toBe('5');
        expect(evaluate('(sum-of-largest-two 1 3 2)')).toBe('5');
        expect(evaluate('(sum-of-largest-two 2 1 3)')).toBe('5');
        expect(evaluate('(sum-of-largest-two 2 3 1)')).toBe('5');
        expect(evaluate('(sum-of-largest-two 3 1 2)')).toBe('5');
        expect(evaluate('(sum-of-largest-two 3 2 1)')).toBe('5');
      });

      test('Exercise 1.4', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (a-plus-abs-b a b)
            ((if (> b 0) + -) a b))
        `);
        expect(evaluate('(a-plus-abs-b 3 -5)')).toBe('8');
      });

      test('Exercise 1.5', () => {
        expect(() => evaluate(`
          (define (p) (p))
          (define (test x y)
            (if (= x 0)
                0
                y))
          (test 0 (p))
        `)).toThrow('Maximum call stack size exceeded');
      });
    });

    describe('1.1.7 Example: Square Roots by Newton\'s Method', () => {
      test('Using Newton\s Method', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (sqrt-iter guess x)
            (if (good-enough? guess x)
                guess
                (sqrt-iter (improve guess x)
                          x)))
        `);
        evaluate('(define (improve guess x) (average guess (/ x guess)))');
        evaluate('(define (average x y) (/ (+ x y) 2))');
        evaluate('(define (good-enough? guess x) (< (abs (- (square guess) x)) 0.001))');
        evaluate('(define (sqrt x) (sqrt-iter 1.0 x))');
        evaluate('(define (square x) (* x x))');
        evaluate('(define (abs x) (if (< x 0) (- x) x))');
        expect(evaluate('(sqrt 9)')).toBe('3.00009155413138');
        expect(evaluate('(sqrt (+ 100 37))')).toBe('11.704699917758145');
        expect(evaluate('(sqrt (+ (sqrt 2) (sqrt 3)))')).toBe('1.7739279023207892');
        expect(evaluate('(square (sqrt 1000))')).toBe('1000.000369924366');
      });
    });

    describe('1.1.8 Procedures as Black-Box Abstractions', () => {
      test('Internal definitions', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (sqrt x)
            (define (good-enough? guess x)
              (< (abs (- (square guess) x)) 0.001))
            (define (improve guess x)
              (average guess (/ x guess)))
            (define (sqrt-iter guess x)
              (if (good-enough? guess x)
                  guess
                  (sqrt-iter (improve guess x) x)))
            (sqrt-iter 1.0 x))
        `);
        evaluate('(define (average x y) (/ (+ x y) 2))');
        evaluate('(define (square x) (* x x))');
        evaluate('(define (abs x) (if (< x 0) (- x) x))');
        expect(evaluate('(sqrt 9)')).toBe('3.00009155413138');
        expect(evaluate('(sqrt (+ 100 37))')).toBe('11.704699917758145');
        expect(evaluate('(sqrt (+ (sqrt 2) (sqrt 3)))')).toBe('1.7739279023207892');
        expect(evaluate('(square (sqrt 1000))')).toBe('1000.000369924366');
      });

      test('Lexical scope', () => {
        const evaluate = evaluator();
        evaluate(`
          (define (sqrt x)
            (define (good-enough? guess)
              (< (abs (- (square guess) x)) 0.001))
            (define (improve guess)
              (average guess (/ x guess)))
            (define (sqrt-iter guess)
              (if (good-enough? guess)
                  guess
                  (sqrt-iter (improve guess))))
            (sqrt-iter 1.0))
        `);
        evaluate('(define (average x y) (/ (+ x y) 2))');
        evaluate('(define (square x) (* x x))');
        evaluate('(define (abs x) (if (< x 0) (- x) x))');
        expect(evaluate('(sqrt 9)')).toBe('3.00009155413138');
        expect(evaluate('(sqrt (+ 100 37))')).toBe('11.704699917758145');
        expect(evaluate('(sqrt (+ (sqrt 2) (sqrt 3)))')).toBe('1.7739279023207892');
        expect(evaluate('(square (sqrt 1000))')).toBe('1000.000369924366');
      });
    });
  });
});
