package tree_sitter_oxiby_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_oxiby "github.com/oxiby/tree-sitter-oxiby/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_oxiby.Language())
	if language == nil {
		t.Errorf("Error loading Oxiby grammar")
	}
}
