import XCTest
import SwiftTreeSitter
import TreeSitterOxiby

final class TreeSitterOxibyTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_oxiby())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Oxiby grammar")
    }
}
