//
//  yavaleTests.swift
//  yavaleTests
//
//  Created by SAGA DURAN on 16/7/25.
//

import XCTest
@testable import APP

final class yavaleTests: XCTestCase {

    override func setUpWithError() throws {
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func testExample() throws {
        // El proyecto movido debe incluir el cliente canonico, no un HTML de raiz ausente.
        let html = try XCTUnwrap(Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "WebBundle"))
        XCTAssertTrue(try String(contentsOf: html, encoding: .utf8).contains("Playlist AceStream"))
        XCTAssertNotNil(Bundle.main.url(forResource: "playlist", withExtension: "json", subdirectory: "WebBundle"))
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
        // Any test you write for XCTest can be annotated as throws and async.
        // Mark your test throws to produce an unexpected failure when your test encounters an uncaught error.
        // Mark your test async to allow awaiting for asynchronous code to complete. Check the results with assertions afterwards.
    }

    func testPerformanceExample() throws {
        // This is an example of a performance test case.
        self.measure {
            // Put the code you want to measure the time of here.
        }
    }

}
