import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const transactionRef = collection(db, "transactions");

export const addTransaction = async (data) => {
  await addDoc(transactionRef, data);
};

export const getTransactions = async () => {

  const snapshot = await getDocs(transactionRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

};