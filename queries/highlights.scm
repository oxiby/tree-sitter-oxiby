; Identifiers

(type_identifier) @type
(expr_identifier) @variable

; Comments

(comment) @comment

; Punctuation

"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket

"." @punctuation.delimiter
":" @punctuation.delimiter

(record_struct
  name: (_) @variable.parameter)

(record_variant
  name: (_) @variable.parameter)

(struct_literal
  field: (expr_identifier) @variable.parameter)

; Keywords

[
  "->"
  "^"
  "break"
  "else"
  "enum"
  "fn"
  "for"
  "if"
  "pub"
  "impl"
  "in"
  "let"
  "loop"
  "match"
  "pub"
  "return"
  "struct"
  "trait"
  "type"
  "use"
  "where"
  "while"
] @keyword

(continue) @keyword

; Operators

[
  "..="
  "..<"
  "&&"
  "||"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "+"
  "-"
  "*"
  "/"
  "%"
  "+="
  "-="
  "*="
  "/"
  "="
] @operator

; Literals

(string) @string
(integer) @constant.builtin
(float) @constant.builtin
"true" @constant.builtin
"false" @constant.builtin

; Expressions

(call
  name: (scoped_expr_identifier
    (expr_identifier) @function.call))

(call
  name: (field
    value: (scoped_expr_identifier
      (expr_identifier))
    field: (expr_identifier) @function.call))

(keyword_args
  name: (expr_identifier) @variable.parameter)

; Bindings

(pattern_record_struct
  name: (expr_identifier) @variable.parameter)

(pattern_record_struct
  rename: (expr_identifier) @variable.parameter)

; Types

(type
  (variable_type
    (expr_identifier) @type))


; Functions

(fn_signature
  name: (expr_identifier) @function)

(positional_params
  parameter_name: (expr_identifier) @variable.parameter)

(keyword_params
  keyword_param_indicator: ":" @variable.parameter
  parameter_name: (expr_identifier) @variable.parameter)

(closure
  name: (expr_identifier) @variable.parameter)

"self" @variable.parameter.builtin

; Imports

(item_use
  (
    (expr_identifier)
    ("." (expr_identifier))*
  ) @module
  import: [(expr_identifier) @function (type_identifier) @type])
