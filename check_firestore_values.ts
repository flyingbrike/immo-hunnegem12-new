import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Firestore Database ID:", firebaseConfig.firestoreDatabaseId || "default");
  
  const docsToCheck = [
    { col: 'home_data', id: 'page_content' },
    { col: 'technical_data', id: 'page_content' },
    { col: 'contact_data', id: 'page_content' },
    { col: 'surroundings_data', id: 'page_content' }
  ];

  for (const item of docsToCheck) {
    try {
      const snap = await getDoc(doc(db, item.col, item.id));
      if (snap.exists()) {
        console.log(`=== ${item.col}/${item.id} ===`);
        console.log(JSON.stringify(snap.data(), null, 2));
      } else {
        console.log(`=== ${item.col}/${item.id} (not found) ===`);
      }
    } catch (e: any) {
      console.error(`Error reading ${item.col}/${item.id}:`, e.message);
    }
  }

  // Also query collections to see how many documents exist
  const collections = ['gallery', 'surroundings_gallery'];
  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`=== Collection ${colName}: ${snap.size} documents ===`);
      snap.forEach(doc => {
        console.log(`- Doc ID: ${doc.id}, Title: ${doc.data().title}, Has URL: ${!!doc.data().url}`);
      });
    } catch (e: any) {
      console.error(`Error listing collection ${colName}:`, e.message);
    }
  }
}

run();
