// src/db.ts
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from "firebase/firestore";
import { app } from "./firebase";

let db: Firestore;

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  // Если инициализация уже была, просто получаем экземпляр
  db = getFirestore(app);
}

export { db };