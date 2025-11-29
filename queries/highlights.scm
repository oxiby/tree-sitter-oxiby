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

(type_params
  "<" @punctuation.bracket
  [
    (type_identifier) @type
    (expr_identifier) @type
  ]
  ">" @punctuation.bracket)

(struct_fields
  name: (_) @variable.parameter)

(struct_fields
  type: (_) @type)

(enum_fields
  name: (_) @variable.parameter)

(enum_fields
  type: (_) @type)

; ([(struct_record_fields) (enum_record_fields)]
;   name: (expr_identifier) @variable.parameter
;   type: (_) @type)

; (tuple_fields
;   "(" @punctuation.bracket
;   type: [
;     (type_identifier) @type
;     (expr_identifier) @type
;   ]
;   ")" @punctuation.bracket)

; Keywords

[
  "break"
  "else"
  "enum"
  "fn"
  "for"
  "if"
  ; "impl"
  "in"
  ; "is"
  "let"
  "loop"
  ; "match"
  "return"
  ; "self"
  ; "Self"
  "struct"
  "trait"
  "type"
  "use"
  "where"
  "while"
] @keyword

(visibility) @keyword
(continue) @keyword

; Literals

(string) @string
(integer) @constant.builtin
(float) @constant.builtin
"true" @constant.builtin
"false" @constant.builtin

; Expressions

(call
  name: (expr_identifier) @function)

(arguments
  "(" @punctuation.bracket
  ")" @punctuation.bracket)

(keyword_args
  name: (expr_identifier) @variable.parameter)

(binary_expression
  operator: "."
  right: (_) @variable.member)

; Let bindings

(let
  name: (expr_identifier) @variable)

; Items

; Functions

(fn_signature
  name: (expr_identifier) @function)

(positional_params
  parameter_name: (expr_identifier) @variable.parameter)

(keyword_params
  keyword_param_indicator: ":" @variable.parameter
  parameter_name: (expr_identifier) @variable.parameter)

; Imports

(item_use
  (
    (expr_identifier)
    ("." (expr_identifier))*
  ) @module
  import: [(expr_identifier) @function (type_identifier) @type]
  "->"? @keyword)
