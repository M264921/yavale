import UIKit
import WebKit

class ViewController: UIViewController {
    var webView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        webView = WKWebView(frame: view.bounds)
        view.addSubview(webView)
        if let p = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "html") {
            let u = URL(fileURLWithPath: p)
            webView.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent())
        }
    }
}
