// 1. 從 Firebase SDK 引入所需的功能
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// 2. 您的 Web App 的 Firebase 設定物件

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ4aDtu4K1MmRKXpoKdPZWz0GUezcBbwY",
  authDomain: "japanese-grammar-app.firebaseapp.com",
  projectId: "japanese-grammar-app",
  storageBucket: "japanese-grammar-app.firebasestorage.app",
  messagingSenderId: "85089481579",
  appId: "1:85089481579:web:3624483085b03b628c522e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// 從 app 取得我們需要的服務實例
const db = getFirestore(app);
const auth = getAuth(app);

// 匯出這些實例，讓我們的 React 組件可以使用
export { db, auth, onAuthStateChanged, signInAnonymously };
