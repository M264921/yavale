//
//  ContentView.swift
//  yavale
//
//  Created by SAGA DURAN on 16/7/25.
//

import SwiftUI
import WebKit

private enum DeepLinkConfiguration {
    static let defaultHTMLFile = "index"
    static let allowedHosts: Set<String> = ["montanaopenaitv.github.io"]
}

final class WebViewCoordinator: NSObject {
    var lastLoadedAbsoluteString: String?
}

struct WebView: UIViewRepresentable {
    let htmlFileName: String
    let deepLinkURL: URL?

    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if let deepLinkURL {
            let target = deepLinkURL.absoluteString
            guard context.coordinator.lastLoadedAbsoluteString != target else { return }
            context.coordinator.lastLoadedAbsoluteString = target
            let request = URLRequest(url: deepLinkURL)
            uiView.load(request)
        } else if let filePath = Bundle.main.path(forResource: htmlFileName, ofType: "html") {
            let fileURL = URL(fileURLWithPath: filePath)
            let target = fileURL.absoluteString
            guard context.coordinator.lastLoadedAbsoluteString != target else { return }
            context.coordinator.lastLoadedAbsoluteString = target
            uiView.loadFileURL(fileURL, allowingReadAccessTo: fileURL.deletingLastPathComponent())
        }
    }
}

struct ContentView: View {
    @State private var deepLinkURL: URL?

    var body: some View {
        WebView(htmlFileName: DeepLinkConfiguration.defaultHTMLFile, deepLinkURL: deepLinkURL)
            .edgesIgnoringSafeArea(.all)
            .onOpenURL { url in
                updateDeepLink(with: url)
            }
            .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                if let url = activity.webpageURL {
                    updateDeepLink(with: url)
                }
            }
    }

    private func updateDeepLink(with url: URL) {
        guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else {
            return
        }
        if let host = url.host?.lowercased(), !DeepLinkConfiguration.allowedHosts.contains(host) {
            return
        }
        guard deepLinkURL != url else { return }
        deepLinkURL = url
    }
}
