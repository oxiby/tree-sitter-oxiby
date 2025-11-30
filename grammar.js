/**
 * @file Oxiby grammar for tree-sitter
 * @author Jimmy Cuadra <jimmy@jimmycuadra.com>
 * @license Apache-2.0 WITH LLVM-exception
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const sepBy1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));
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

  rules: {
    source_file: $ => repeat($._item),

    comment: _ => seq(
      "//",
      /.*/,
    ),

    _item: $ => choice(
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

    type_identifier: _ => /[A-Z][0-9A-Za-z]*/,

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

    _expression: $ => choice(
      // Literals
      $.boolean,
      $.float,
      $.integer,
      $.string,

      // Compound primitives
      $.hash_map,
      $.list,
      $.tuple,

      // Data structures
      $.struct_literal,
      $.enum_literal,

      // Identifiers
      $.expr_identifier,

      // Member access
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
      $.unary_expression,
      $.binary_expression,
      $.parenthesized,
    ),

    boolean: _ => choice(
      "true",
      "false",
    ),

    float: _ => /\d+\.\d+/,

    integer: _ => /\d+/,

    string: _ => seq('"', /[^"]*/, '"'),

    hash_map: $ => seq(
      "[",
        sepBy1(",",
          seq(
            $._expression,
            ":",
            $._expression,
          ),
        ),
        optional(","),
      "]",
    ),

    list: $ => seq(
      "[",
      sepBy(",", $._expression),
      optional(","),
      "]",
    ),

    tuple: $ => choice(
      seq("(", ")"),
      seq("(", $._expression, ",", ")"),
      seq(
        "(",
          $._expression,
          ",",
          sepBy1(",", $._expression),
          optional(","),
        ")",
      )
    ),

    expr_identifier: _ => /[a-z_][0-9A-Za-z_]*/,

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
      optional(seq(field("type", $.type_identifier), ".")),
      field("name", $.expr_identifier),
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
      field("expression", $._expression),
    ),

    keyword_args: $ => sepBy1(",",
      seq(
        field("name", $.expr_identifier),
        ":",
        field("expr", $._expression),
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
      field("body", repeat($._expression)),
      "}",
    ),

    let: $ => seq(
      "let",
      field("pattern", $.pattern),
      "=",
      field("value", $._expression),
    ),

    match: $ => seq(
      "match",
      field("expr", $._expression),
      "{",
      field("arms", sepBy1(",", $.match_arm)),
      optional(","),
      "}",
    ),

    match_arm: $ => seq(
      $.pattern,
      "->",
      $._expression,
    ),

    break: $ => prec.left(seq(
      "break",
      optional($._expression),
    )),

    conditional: $ => seq(
      "if",
      $._expression,
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
      $._expression,
      $.block,
    ),

    loop: $ => seq(
      "loop",
      $.block,
    ),

    return: $ => prec.left(seq(
      "return",
      optional($._expression),
    )),

    while_loop: $ => seq(
      "while",
      field("predicate", $._expression),
      $.block,
    ),

    pattern: $ => choice(
      $.pattern_literal,
      $.pattern_type,
      $.expr_identifier,
      $.pattern_tuple,
      $.pattern_ctor,
      "_",
    ),

    pattern_literal: $ => choice(
      $.boolean,
      $.float,
      $.integer,
      $.string,
    ),

    pattern_type: $ => seq(
      $.expr_identifier,
      ":",
      $.type_identifier,
    ),

    pattern_tuple: $ => seq(
      "(",
      $.pattern,
      ",",
      $.pattern,
      optional(sepBy(",", $.pattern)),
      ")",
    ),

    pattern_ctor: $ => prec.left(seq(
      optional(field("parent_type", seq($.type_identifier, "."))),
      field("type", $.type_identifier),
      optional(field("idents", choice(
        seq("(", "_", ")"),
        seq("(", sepBy(",", $.expr_identifier), ")"),
        seq("{", sepBy(",", $.expr_identifier), "}"),
      )))),
    ),

    struct_literal: $ => prec.left(seq(
      field("name", $.type_identifier),
      optional(choice(
        $.field_struct_literal,
        $.tuple_struct_literal,
      )),
    )),

    field_struct_literal: $ => seq(
      "{",
      sepBy1(",",
        seq(
          field("name", $.expr_identifier),
          ":",
          field("value", $._expression),
        )
      ),
      optional(","),
      "}",
    ),

    tuple_struct_literal: $ => prec(2, seq(
      "(",
      sepBy1(",", field("value", $._expression)),
      optional(","),
      ")",
    )),

    enum_literal: $ => prec(2, seq(
      field("type", $.type_identifier),
      ".",
      field("variant", $.struct_literal),
    )),

    block: $ => seq(
      "{",
      repeat($._expression),
      "}",
    ),

    index: $ => prec(1, seq(
      field("expr", $._expression),
      "[",
      field("index", $._expression),
      "]",
    )),

    unary_expression: $ => prec(3, seq(
      choice("-", "!"),
      $._expression,
    )),

    binary_expression: $ => prec.left(2, seq(
      field("left", $._expression),
      field("operator", choice("..=", "..<", "+", "-", "*", "/", "%", "==", "!=", "<", "<=", ">", ">=", ".", "=")),
      field("right", $._expression),
    )),

    parenthesized: $ => seq("(", $._expression, ")"),
  }
});
