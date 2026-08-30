import { useState } from "react";
import CameraButton from "../../components/CameraButton";
import { useParams, useNavigate } from "react-router-dom";

import { db, auth } from "../../firebase/config";
import {
 collection,
 addDoc,
 serverTimestamp,
 doc,
 runTransaction
} from "firebase/firestore";

import {
 getStorage,
 ref,
 uploadBytes,
 getDownloadURL
} from "firebase/storage";

function MobileLaporanForm(){

 const { projectId } = useParams();
 const navigate = useNavigate();

 const [items,setItems] = useState([{ nama:"", harga:"" }]);
 const [catatan,setCatatan] = useState("");
 const [loading,setLoading] = useState(false);

 // 🔥 FOTO
 const [receipt,setReceipt] = useState(null);
 const [preview,setPreview] = useState(null);

 /* ======================
    GET LOCATION
 ====================== */

 const getLocation = () => {
  return new Promise((resolve, reject) => {

   if (!navigator.geolocation) {
    reject("Geolocation tidak didukung");
   }

   navigator.geolocation.getCurrentPosition(
    (pos) => {
     resolve({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
     });
    },
    (err) => reject(err.message),
    { enableHighAccuracy:true, timeout:10000 }
   );

  });
 };

 /* ======================
    HANDLE FOTO
 ====================== */

 const handlePickImage = (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  if(!file.type.startsWith("image/")){
   alert("Hanya file gambar yang diizinkan");
   e.target.value = "";
   return;
  }

  // optional: limit size 2MB
  if(file.size > 2 * 1024 * 1024){
   alert("Max 2MB");
   return;
  }

  setReceipt(file);
  setPreview(URL.createObjectURL(file));
 };

 /* ======================
    UPLOAD FOTO
 ====================== */

 const uploadImage = async (file, userId)=>{

  const storage = getStorage();

  const fileName = `kuitansi/${userId}/${Date.now()}_${file.name}`;

  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);

 };

 /* ======================
    ITEM
 ====================== */

 const addItem = ()=>{
  setItems([...items,{ nama:"", harga:"" }]);
 };

 const updateItem = (i,field,value)=>{
  const data = [...items];
  data[i][field] = value;
  setItems(data);
 };

 const total = items.reduce(
  (t,i)=> t + (Number(i.harga)||0),
  0
 );

 /* ======================
    SUBMIT
 ====================== */

 const handleSubmit = async ()=>{

  try{

   if(!projectId){
    alert("Project tidak ditemukan");
    return;
   }

   if(items.some(i=>!i.nama || !i.harga)){
    alert("Item belum lengkap");
    return;
   }

 

   setLoading(true);

   const user = auth.currentUser;
   if(!user){
    alert("Belum login");
    return;
   }

   /* ======================
      LOKASI
   ====================== */

   let location = null;

   try{
    location = await getLocation();
   }catch(err){
    console.log("Lokasi gagal:", err);
   }

   /* ======================
      FOTO (OPSIONAL)
   ====================== */

   let receiptUrl = null;

   if(receipt){
    receiptUrl = await uploadImage(receipt, user.uid);
   }

   /* ======================
      DATA
   ====================== */

   const data = {
    items,
    total_pengeluaran: total,
    catatan,

    created_by:{
     uid:user.uid,
     email:user.email
    },

    created_at: serverTimestamp(),

    latitude: location?.lat || null,
    longitude: location?.lng || null,

    // 🔥 OPSIONAL
    receipt_photo: receiptUrl || null
   };

   /* ======================
      SIMPAN LAPORAN
   ====================== */

   const laporanRef = await addDoc(
    collection(db,"work_orders",projectId,"laporan"),
    data
   );

   /* ======================
      ITEMS GLOBAL
   ====================== */

   await Promise.all(
    items.map(item=>
     addDoc(collection(db,"items_global"),{
      nama:item.nama,
      harga:Number(item.harga),
      project_id:projectId,
      laporan_id:laporanRef.id,
      user_uid:user.uid,
      user_email:user.email,
      created_at: serverTimestamp()
     })
    )
   );

   /* ======================
      UPDATE SALDO
   ====================== */

   const userRef = doc(db,"users",user.uid);

   await runTransaction(db, async(transaction)=>{

    const snap = await transaction.get(userRef);

    const saldo = snap.data()?.saldo || 0;

    transaction.update(userRef,{
     saldo: saldo - total
    });

   });

   alert("Laporan berhasil dikirim");

   navigate("/app-mobile");

  }catch(err){

   console.error(err);
   alert("Gagal kirim laporan");

  }finally{
   setLoading(false);
  }

 };

 /* ======================
    UI
 ====================== */

 return(

  <div className="space-y-4">

   <h1 className="text-lg font-semibold">
    Laporan Project {projectId}
   </h1>

   {/* ITEMS */}
   {items.map((item,i)=>(

    <div key={i} className="bg-white p-4 rounded-xl shadow">

     <input
      className="w-full border p-2 rounded mb-2"
      placeholder="Nama Item"
      value={item.nama}
      onChange={(e)=>updateItem(i,"nama",e.target.value)}
     />

     <input
      className="w-full border p-2 rounded"
      placeholder="Harga"
      type="number"
      value={item.harga}
      onChange={(e)=>updateItem(i,"harga",e.target.value)}
     />

    </div>

   ))}

   {/* TAMBAH */}
   <button
    onClick={addItem}
    className="w-full bg-blue-600 text-white py-2 rounded-xl"
   >
    + Tambah Item
   </button>

   {/* TOTAL */}
   <div className="font-semibold">
    Total: Rp {total.toLocaleString()}
   </div>

   {/* CATATAN */}
   <textarea
    className="w-full border p-3 rounded-xl"
    placeholder="Catatan..."
    value={catatan}
    onChange={(e)=>setCatatan(e.target.value)}
   />

   {/* FOTO KUITANSI (OPSIONAL) */}
   <div className="space-y-2">

    <p className="text-sm text-gray-600">
     Foto Kuitansi (opsional)
    </p>

    <CameraButton
     onChange={handlePickImage}
     captureEnv={true}
     className="w-full border rounded-lg p-2 bg-gray-50 text-sm text-gray-600 text-center cursor-pointer block"
    >
     Pilih / Ambil Foto
    </CameraButton>

    {preview && (
     <img
      src={preview}
      className="w-full h-40 object-cover rounded-xl"
     />
    )}

   </div>

   {/* SUBMIT */}
   <button
    onClick={handleSubmit}
    disabled={loading}
    className="w-full bg-green-600 text-white py-3 rounded-xl disabled:opacity-50"
   >
    {loading ? "Mengirim..." : "Submit Laporan"}
   </button>

  </div>

 );

}

export default MobileLaporanForm;