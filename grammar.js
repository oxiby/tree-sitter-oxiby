/**
 * @file Oxiby grammar for tree-sitter
 * @author Jimmy Cuadra <jimmy@jimmycuadra.com>
 * @license Apache-2.0 WITH LLVM-exception
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  call: 9,
  field: 8,
  unary: 7,
  multiplicative: 6,
  additive: 5,
  comparative: 4,
  and: 3,
  or: 2,
  range: 1,
  assign: 0,
};

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
const sepBy1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));

/**
 * @param {RuleOrLiteral} sep
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
const sepBy = (sep, rule) => optional(sepBy1(sep, rule));

module.exports = grammar({
  name: "oxiby",

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$.positional_params],
    [$.positional_args],
  ],

  supertypes: $ => [
    $.item,
    $.expression,
    $.expression_with_trailing_block,
  ],

  rules: {
    source_file: $ => repeat($.item),

    comment: _ => seq(
      "//",
      /.*/,
    ),

    item: $ => choice(
      $.item_enum,
      $.item_fn,
      $.item_impl,
      $.item_struct,
      $.item_trait,
      $.item_use,
    ),

    item_enum: $ => seq(
      optional("pub"),
      "enum",
      field("name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      "{",
      sepBy(",", field("variant", $.variant)),
      optional(","),
      optional(field("functions", repeat1($.item_fn))),
      "}"
    ),

    fn_signature: $ => seq(
      optional("pub"),
      "fn",
      field("name", $.expr_identifier),
      field("parameters", $.parameters),
      optional(field(
        "return_type",
        seq(
          "->",
          $.type,
        ),
      )),
      optional(field("where_clause", $.where_clause)),
    ),

    item_fn: $ => seq(
      field("signature", $.fn_signature),
      field("body", $.block),
    ),

    item_struct: $ => prec.left(seq(
      optional("pub"),
      "struct",
      field("name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      optional(field("body", choice($.tuple_struct, $.record_struct))),
    )),

    tuple_struct: $ => seq(
      "(",
      sepBy(",",
        seq(optional("pub"), field("type", $.type)),
      ),
      optional(","),
      ")",
      optional(seq("{", repeat1($.item_fn), "}")),
    ),

    record_struct: $ => seq(
      "{",
      sepBy(",",
        seq(
          optional("pub"),
          field("name", $.expr_identifier),
          ":",
          field("type", $.type),
        ),
      ),
      optional(","),
      optional(field("functions", repeat1($.item_fn))),
      "}",
    ),

    variant: $ => seq(
      field("name", $.type_identifier),
      optional(field("fields", choice($.tuple_variant, $.record_variant)))
    ),

    tuple_variant: $ => seq(
      "(",
      sepBy(",",
        field("type", $.type),
      ),
      optional(","),
      ")",
    ),

    record_variant: $ => seq(
      "{",
      sepBy(",",
        seq(
          field("name", $.expr_identifier),
          ":",
          field("type", $.type),
        ),
      ),
      optional(","),
      "}",
    ),

    type_params: $ => seq(
      "<",
      sepBy1(",", $.type),
      ">",
    ),

    item_trait: $ => seq(
      optional("pub"),
      "trait",
      field("name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      optional(field("where_clause", $.where_clause)),
      "{",
      optional(field("associated_types", repeat1($.associated_type))),
      optional(field("functions", repeat1(choice($.item_fn, $.fn_signature)))),
      "}",
    ),

    item_impl: $ => seq(
      "impl",
      field("trait_name", $.type_identifier),
      optional(field("trait_params", $.type_params)),
      "for",
      field("type_name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      optional(field("where_clause", $.where_clause)),
      "{",
      optional(field("associated_types", repeat1($.associated_type))),
      optional(field("functions", repeat1($.item_fn))),
      "}",
    ),

    where_clause: $ => seq(
      "where",
      sepBy1(",", $.constraint),
      optional(","),
    ),

    constraint: $ => seq(
      field("type", $.type),
      optional(field("bounds", seq(":", $.bounds))),
      optional(field("default", seq("=", $.type))),
    ),

    bounds: $ => sepBy1("+", $.type_identifier),

    associated_type: $ => seq(
      "type",
      field("name", $.type_identifier),
      optional(field("bounds", seq(":", sepBy1(",", $.bounds)))),
      optional(field("default", seq("=", $.type))),
    ),

    item_use: $ => seq(
      "use",
      field("module", sepBy1(".", $.expr_identifier)),
      field("import", sepBy1(",",
        seq(
          choice(
            $.expr_identifier,
            seq(
              $.type_identifier,
              optional(seq(".", $.type_identifier)),
            ),
          ),
          field("rename", optional(
            seq(
              "->",
              choice(
                $.expr_identifier,
                $.type_identifier,
              ),
            ),
          )),
        ),
      )),
    ),

    expr_identifier: _ => /[a-z_][0-9A-Za-z_]*/,

    scoped_expr_identifier: $ => prec.right(seq(
      optional(seq(field("scope", $.type_identifier), ".")),
      $.expr_identifier,
    )),

    type_identifier: _ => /[A-Z][0-9A-Za-z]*/,

    scoped_type_identifier: $ => prec.right(seq(
      optional(seq(field("scope", $.type_identifier), ".")),
      $.type_identifier,
    )),

    type: $ => choice(
      $.variable_type,
      $.tuple_type,
      $.function_type,
      $.concrete_type,
    ),

    variable_type: $ => $.expr_identifier,

    tuple_type: $ => seq(
      "(",
      sepBy(",", $.type),
      ")",
    ),

    function_type: $ => seq(
      "Fn",
      "(",
      field("parameters", optional(sepBy(",", $.type))),
      ")",
      field("return_type", optional(seq("->", $.type))),
    ),

    concrete_type: $ => seq(
      field("qualifier", optional(seq($.type_identifier, "."))),
      field("type_name", $.type_identifier),
      field("type_parameters", optional($.type_params)),
    ),

    expression: $ => choice(
      // Literals
      $.boolean,
      $.float,
      $.integer,
      $.string,
      $.range,

      // Compound primitives
      $.hash_map,
      $.list,
      $.tuple,

      // Data structures
      $.struct_literal,
      $.enum_literal,

      // Identifiers
      $.scoped_expr_identifier,
      $.scoped_type_identifier,

      // Member access
      $.field,
      $.index,

      // Calls
      $.call,
      $.closure,

      // Control flow
      $.break,
      $.conditional,
      $.continue,
      $.for_loop,
      $.loop,
      $.return,
      $.while_loop,

      // Patterns
      $.let,
      $.match,

      // Misc.
      $.assignment,
      $.unary,
      $.binary,
      $.parenthesized,
      $.expression_with_trailing_block,
    ),

    expression_with_trailing_block: $ => choice(
      $.block,
    ),

    boolean: _ => choice(
      "true",
      "false",
    ),

    float: _ => /\d+\.\d+/,

    integer: _ => /\d+/,

    string: _ => seq('"', /[^"]*/, '"'),

    range: $ => prec.left(PREC.range, seq(
      optional(field("start", $.expression)),
      "..",
      choice("=", "<"),
      optional(field("end", $.expression)),
    )),

    hash_map: $ => seq(
      "[",
        sepBy1(",",
          seq(
            $.expression,
            ":",
            $.expression,
          ),
        ),
        optional(","),
      "]",
    ),

    list: $ => seq(
      "[",
      sepBy(",", $.expression),
      optional(","),
      "]",
    ),

    tuple: $ => choice(
      seq("(", ")"),
      seq("(", $.expression, ",", ")"),
      seq(
        "(",
          $.expression,
          ",",
          sepBy1(",", $.expression),
          optional(","),
        ")",
      )
    ),

    parameters: $ => seq(
      "(",
      optional(choice(
        seq(
          $.positional_params,
          ",",
          $.keyword_params,
        ),
        $.keyword_params,
        $.positional_params,
      )),
      ")",
    ),

    self: _ => "self",

    positional_params: $ => sepBy1(",",
      choice(
        "self",
        seq(
          field("parameter_name", $.expr_identifier),
          ":",
          field("parameter_type", $.type),
        ),
      ),
    ),

    keyword_params: $ => sepBy1(",",
      seq(
        field("keyword_param_indicator", ":"),
        field("parameter_name", $.expr_identifier),
        ":",
        field("parameter_type", $.type),
      ),
    ),

    call: $ => prec(2, seq(
      field("name", $.expression),
      field("arguments", $.arguments),
    )),

    arguments: $ => seq(
      "(",
      optional(choice(
        seq(
          $.positional_args,
          ",",
          $.keyword_args,
        ),
        $.keyword_args,
        $.positional_args,
      )),
      ")",
    ),

    positional_args: $ => sepBy1(",",
      field("expression", $.expression),
    ),

    keyword_args: $ => sepBy1(",",
      seq(
        field("name", $.expr_identifier),
        ":",
        field("expr", $.expression),
      ),
    ),

    closure: $ => seq(
      "fn",
      "(",
      sepBy(",",
        seq(
          field("name", $.expr_identifier),
          optional(seq(":", field("type", $.type))),
        ),
      ),
      optional(","),
      ")",
      optional(seq(
        "->",
        field("return_type", $.type),
      )),
      "{",
      field("body", repeat($.expression)),
      "}",
    ),

    let: $ => prec.right(seq(
      "let",
      field("pattern", $.pattern),
      optional(seq(":", field("type", $.type))),
      "=",
      field("value", $.expression),
    )),

    match: $ => seq(
      "match",
      field("expr", $.expression),
      field("body", $.match_body),
    ),

    match_body: $ => seq(
      "{",
      repeat($.match_arm),
      alias($.last_match_arm, $.match_arm),
      "}",
    ),

    match_arm: $ => prec.right(seq(
      field("pattern", $.pattern),
      "->",
      choice(
        seq(field("expr", $.expression), ","),
        field("expr", prec(1, $.expression_with_trailing_block)),
      ),
    )),

    last_match_arm: $ => prec.right(seq(
      field("pattern", $.pattern),
      "->",
      field("expr", $.expression),
      optional(","),
    )),

    break: $ => prec.left(seq(
      "break",
      optional($.expression),
    )),

    conditional: $ => seq(
      "if",
      $.expression,
      $.block,
      optional(
        seq(
          "else",
          choice(
            $.conditional,
            $.block,
          ),
        ),
      ),
    ),
    continue: _ => "continue",

    for_loop: $ => seq(
      "for",
      $.pattern,
      "in",
      $.expression,
      $.block,
    ),

    loop: $ => seq(
      "loop",
      $.block,
    ),

    return: $ => prec.left(seq(
      "return",
      optional($.expression),
    )),

    while_loop: $ => seq(
      "while",
      field("predicate", $.expression),
      $.block,
    ),

    pattern: $ => choice(
      $.pattern_literal,
      $.expr_identifier,
      $.scoped_type_identifier,
      $.pattern_tuple,
      $.pattern_list,
      $.pattern_tuple_struct,
      $.pattern_record_struct,
      "_",
    ),

    pattern_literal: $ => choice(
      $.boolean,
      $.float,
      $.integer,
      $.string,
    ),

    pattern_tuple: $ => seq(
      "(",
      optional(sepBy(",", $.pattern)),
      optional(","),
      ")",
    ),

    pattern_list: $ => seq(
      "[",
      optional(sepBy(",", $.pattern)),
      optional(","),
      "]",
    ),

    pattern_tuple_struct: $ => seq(
      field("type", choice(
        $.scoped_type_identifier,
      )),
      "(",
      sepBy(",", $.pattern),
      optional(","),
      ")",
    ),

    pattern_record_struct: $ => seq(
      field("type", choice(
        $.scoped_type_identifier,
      )),
      "{",
      sepBy(",", seq(
        field("name", $.expr_identifier),
        ":",
        field("pattern", $.pattern),
      )),
      optional(","),
      "}",
    ),

    pattern_struct: $ => prec.left(seq(
      optional(field("parent_type", seq($.type_identifier, "."))),
      field("type", $.type_identifier),
      optional(field("patterns", choice(
        seq("(", "_", ")"),
        seq("(", sepBy(",", $.pattern), ")"),
        seq("{", sepBy(",", $.pattern), "}"),
      )))),
    ),

    struct_literal: $ => seq(
      field("name", $.type_identifier),
      "{",
      sepBy(",",
        seq(
          field("field", $.expr_identifier),
          ":",
          field("value", $.expression),
        )
      ),
      optional(","),
      "}",
    ),

    enum_literal: $ => prec(2, seq(
      field("type", $.type_identifier),
      ".",
      field("variant", $.struct_literal),
    )),

    block: $ => seq(
      "{",
      repeat($.expression),
      "}",
    ),

    field: $ => prec(PREC.field, seq(
      field("value", $.expression),
      ".",
      field("field", choice($.expr_identifier, $.integer)),
    )),

    index: $ => prec(PREC.call, seq(
      field("expr", $.expression),
      "[",
      field("index", $.expression),
      "]",
    )),

    assignment: $ => prec.left(PREC.assign, seq(
      field("lhs", $.expression),
      "=",
      field("right", $.expression),
    )),

    unary: $ => prec(PREC.unary, seq(
      choice("-", "!"),
      $.expression,
    )),

    binary: $ => {
      const table = [
        [PREC.and, "&&"],
        [PREC.or, "||"],
        [PREC.comparative, choice("==", "!=", "<", "<=", ">", ">=")],
        [PREC.additive, choice("+", "-")],
        [PREC.multiplicative, choice("*", "/", "%")],
      ];

      // @ts-ignore
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field("lhs", $.expression),
        // @ts-ignore
        field("operator", operator),
        field("rhs", $.expression),
      ))));
    },

    parenthesized: $ => seq("(", $.expression, ")"),
  }
});
