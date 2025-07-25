import XCTest
import WebKit
@testable import yavale

final class WebViewTests: XCTestCase {
    private class Delegate: NSObject, WKNavigationDelegate {
        let finished: () -> Void
        init(_ finished: @escaping () -> Void) { self.finished = finished }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            finished()
        }
    }

    func testLoadsBundledHTML() throws {
        let expectation = expectation(description: "load")
        let webView = WKWebView()
        let delegate = Delegate { expectation.fulfill() }
        webView.navigationDelegate = delegate

        guard let path = Bundle(for: type(of: self)).path(forResource: "index", ofType: "html") else {
            XCTFail("index.html missing in bundle")
            return
        }
        let url = URL(fileURLWithPath: path)
        webView.loadFileURL(url, allowingReadAccessTo: url)
        wait(for: [expectation], timeout: 5)
        XCTAssertEqual(webView.url?.path, url.path)
    }
}
