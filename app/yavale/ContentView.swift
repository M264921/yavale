//
//  ContentView.swift
//  yavale
//
//  Created by SAGA DURAN on 16/7/25.
//

import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let htmlFileName: String

    func makeUIView(context: Context) -> WKWebView {
        return WKWebView()
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        if let filePath = Bundle.main.path(forResource: htmlFileName, ofType: "html") {
            let fileURL = URL(fileURLWithPath: filePath)
            uiView.loadFileURL(fileURL, allowingReadAccessTo: fileURL)
        }
    }
}

struct ContentView: View {
    var body: some View {
        WebView(htmlFileName: "index") // sin .html
            .edgesIgnoringSafeArea(.all)
    }
}
