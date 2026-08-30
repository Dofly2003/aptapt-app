import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

export const cleanupTrainingData = async () => {

 try{

  const snapshot = await getDocs(
   collection(db,"work_orders")
  );

  const now = new Date();

  snapshot.forEach(async(docSnap)=>{

   const data = docSnap.data();

   if(data.training_mode && data.delete_after){

    const deleteDate = data.delete_after.toDate();

    if(deleteDate <= now){

     await deleteDoc(
      doc(db,"work_orders",docSnap.id)
     );

     console.log("Deleted training project:",docSnap.id);

    }

   }

  });

 }catch(err){

  console.error("Cleanup error:",err);

 }

};