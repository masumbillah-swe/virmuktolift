import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDpoBslMAvPsIMFjjbg69Y0yA-UmNaiB-M",
  authDomain: "virmukto-lift.firebaseapp.com",
  databaseURL: "https://virmukto-lift-default-rtdb.firebaseio.com",
  projectId: "virmukto-lift",
  storageBucket: "virmukto-lift.firebasestorage.app",
  messagingSenderId: "898891854175",
  appId: "1:898891854175:web:f4c2e3d290baa4d57c86ea"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); // নিশ্চিত কর এই লাইনটা আছে