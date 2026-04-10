import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBUgR28i4ZBTRsRVrLZPp9bZ6ZQrUPShzs",
  authDomain: "los-cachorros-b8256.firebaseapp.com",
  projectId: "los-cachorros-b8256",
  storageBucket: "los-cachorros-b8256.firebasestorage.app",
  messagingSenderId: "631439834677",
  appId: "1:631439834677:web:ea8f067785114cb9ef7b7c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
