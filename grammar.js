/**
 * @file Oxiby grammar for tree-sitter
 * @author Jimmy Cuadra <jimmy@jimmycuadra.com>
 * @license Apache-2.0 WITH LLVM-exception
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const sepBy1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));
const sepBy = (sep, rule) => optional(sepBy1(sep, rule));

const record_fields = ($, allowPub = false) => {
  const body = [
    field("name", $.expr_identifier),
    ":",
    field("type", choice($.type_identifier, $.expr_identifier)),
  ];

  if (allowPub) {
    body.unshift(optional($.visibility));
  }

  return seq(
    "{",
    sepBy(",",
      seq(...body),
    ),
    ",",
    "}",
  );
};

const tuple_fields = ($, allowPub) => {
  const body = [
    field("type", choice($.type_identifier, $.expr_identifier))
  ];

  if (allowPub) {
    body.unshift(optional($.visibility));
  }

  return seq(
    "(",
    sepBy(",", seq(...body)),
    ")",
  );
};

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
      optional($.visibility),
      "enum",
      field("name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      "{",
      sepBy(",", field("variant", $.variant)),
      optional(","),
      "}"
    ),

    fn_signature: $ => seq(
      field("visibility", optional($.visibility)),
      "fn",
      field("name", $.expr_identifier),
      field("parameters", $.parameters),
      field(
        "return_type",
        optional(
          seq(
            "->",
            seq(optional(seq($.type_identifier, ".")), $.type_identifier),
          ),
        ),
      ),
      field("where_clause", optional($.where_clause)),
    ),

    item_fn: $ => seq(
      field("signature", $.fn_signature),
      field("body", $.block),
    ),

    // item_impl: $ => "TODO",

    item_struct: $ => seq(
      optional($.visibility),
      "struct",
      field("name", $.type_identifier),
      optional(field("type_params", $.type_params)),
      optional(field("fields", $.struct_fields)),
    ),

    variant: $ => seq(
      field("name", $.type_identifier),
      field("fields", optional($.enum_fields))
    ),

    type_params: $ => seq(
      "<",
      sepBy1(",", $.expr_identifier),
      ">",
    ),

    struct_fields: $ => choice(
      $._struct_record_fields,
      $._struct_tuple_fields,
    ),

    enum_fields: $ => choice(
      $._enum_record_fields,
      $._enum_tuple_fields,
    ),

    _struct_record_fields: $ => record_fields($, true),
    _struct_tuple_fields: $ => tuple_fields($, true),
    _enum_record_fields: $ => record_fields($),
    _enum_tuple_fields: $ => tuple_fields($),

    item_trait: $ => seq(
      optional($.visibility),
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
      optional(field("functions", $.item_fn)),
      "}",
    ),

    where_clause: $ => seq(
      "where",
      sepBy1(",", $.constraint),
      optional(","),
    ),

    constraint: $ => seq(
      field("type", choice($.type_identifier, $.expr_identifier)),
      ":",
      field("bounds", $.bounds),
    ),

    bounds: $ => sepBy1("+", $.type_identifier),

    associated_type: $ => seq(
      "type",
      field("name", $.type_identifier),
      optional(field("default", seq("=", $.type_identifier))),
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

    visibility: _ => "pub",

    type_identifier: _ => /[A-Z][0-9A-Za-z]*/,

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
      $.struct_ctor,
      $.enum_ctor,

      // Identifiers
      $.expr_identifier,

      // Member access

      // Calls
      $.call,

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

      // Misc.
      $.unary_expression,
      $.binary_expression,
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
      "]",
    ),

    tuple: $ => seq(
      "(",
        $._expression,
        ",",
        sepBy(",", $._expression),
      ")",
    ),

    expr_identifier: _ => /[a-z_][0-9A-Za-z_]*/,

    parameters: $ => seq(
      "(",
      optional("self"),
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

    positional_params: $ => sepBy1(",",
      seq(
        field("parameter_name", $.expr_identifier),
        ":",
        field("parameter_type", seq(optional(seq($.type_identifier, ".")), $.type_identifier)),
      ),
    ),

    keyword_params: $ => sepBy1(",",
      seq(
        field("keyword_param_indicator", ":"),
        field("parameter_name", $.expr_identifier),
        ":",
        field("parameter_type", seq(optional(seq($.type_identifier, ".")), $.type_identifier)),
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

    let: $ => seq(
      "let",
      field("name", $.expr_identifier),
      "=",
      field("value", $._expression),
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
      "_",
      $.pattern_literal,
      $.expr_identifier,
      $.pattern_tuple,
    ),

    pattern_literal: $ => choice(
      $.boolean,
      $.float,
      $.integer,
      $.string,
    ),

    pattern_tuple: $ => seq(
      "(",
      $.pattern,
      ",",
      $.pattern,
      optional(sepBy(",", $.pattern)),
      ")",
    ),

    struct_ctor: $ => prec.left(seq(
      field("name", $.type_identifier),
      optional(choice(
        $.field_struct_ctor,
        $.tuple_struct_ctor,
      )),
    )),

    field_struct_ctor: $ => seq(
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

    tuple_struct_ctor: $ => seq(
      "(",
      sepBy1(",", field("value", $._expression)),
      ")",
    ),

    enum_ctor: $ => prec(2, seq(
      field("type", $.type_identifier),
      ".",
      field("variant", $.struct_ctor),
    )),

    block: $ => seq(
      "{",
      repeat($._expression),
      "}",
    ),

    unary_expression: $ => prec(3, seq(
      choice("-", "!"),
      $._expression,
    )),

    binary_expression: $ => prec.left(2, seq(
      field("left", $._expression),
      field("operator", choice("+", "-", "*", "/", "==", "!=", "<", "<=", ">", ">=", ".", "=")),
      field("right", $._expression),
    )),
  }
});
