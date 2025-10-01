//
//  yavaleApp.swift
//  yavale
//
//  Created by SAGA DURAN on 16/7/25.
//

import SwiftUI

@main
struct yavaleApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
