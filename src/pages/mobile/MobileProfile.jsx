import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { ShieldCheck, FolderUp } from "lucide-react";
import { auth, db } from "../../firebase/config";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import {
   collection,
   query,
   where,
   onSnapshot
} from "firebase/firestore";

function MobileProfile() {

   const { profile, role } = useContext(AuthContext);
   const isSuperadmin = role === "superadmin";
   const navigate = useNavigate();

   const [loading, setLoading] = useState(false);
   const [items, setItems] = useState([]);
   const [lastItem, setLastItem] = useState(null);
   const [total, setTotal] = useState(0);

   const user = auth.currentUser;

   /* ======================
      AMBIL DATA USER
   ====================== */
   useEffect(() => {

      if (!user) return;

      const q = query(
         collection(db, "items_global"),
         where("user_uid", "==", user.uid)
      );

      const unsub = onSnapshot(q, (snap) => {

         let data = [];
         let totalHarga = 0;

         snap.docs.forEach(doc => {

            const item = doc.data();
            const harga = Number(item.harga) || 0;

            data.push({
               id: doc.id,
               ...item
            });

            totalHarga += harga;

         });

         // SORT TERBARU (MANUAL)
         data.sort((a, b) => {
            const aTime = a.created_at?.seconds || 0;
            const bTime = b.created_at?.seconds || 0;
            return bTime - aTime;
         });

         setItems(data);
         setTotal(totalHarga);

         // AMBIL 1 TERAKHIR
         setLastItem(data[0] || null);

      });

      return () => unsub();

   }, [user]);

   /* ======================
      LOGOUT
   ====================== */
   const handleLogout = async () => {
      try {
         setLoading(true);
         await signOut(auth);
         navigate("/login");
      } catch (err) {
         console.log(err);
         alert("Gagal logout");
      } finally {
         setLoading(false);
      }
   };

   const formatCurrency = (num) => {
      return "Rp " + (num || 0).toLocaleString();
   };

   const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date.seconds * 1000).toLocaleDateString("id-ID");
   };

   return (

      <div className="space-y-4 pb-32">

         {/* PROFILE */}
         <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-4xl mb-2">👤</div>
            <h2 className="font-semibold">
               {profile?.name || "-"}
            </h2>
            <p className="text-sm text-gray-500">
               {profile?.email}
            </p>
         </div>

         {/* INFO */}
         <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500 mb-2">
               Informasi
            </p>
            <p className="text-sm">
               Role: {profile?.role || "-"}
            </p>
         </div>

         {/* RINGKASAN */}
         <div className="bg-white p-4 rounded-xl shadow">
            <p className="text-sm text-gray-500 mb-2">
               Ringkasan Pengeluaran
            </p>

            <div className="flex justify-between text-sm">
               <span>Total</span>
               <span className="font-semibold text-red-500">
                  {formatCurrency(total)}
               </span>
            </div>

            <div className="flex justify-between text-sm mt-1">
               <span>Jumlah Item</span>
               <span className="font-semibold">
                  {items.length}
               </span>
            </div>
         </div>

         {/* 🔥 TRANSAKSI TERAKHIR */}
         <div className="bg-white p-4 rounded-xl shadow">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-2">

               <p className="text-sm text-gray-500">
                  Transaksi Terakhir
               </p>

               <button
                  onClick={() => navigate("/app-mobile/transaksi")}
                  className="text-xs text-blue-600 active:opacity-70"
               >
                  Lihat semua
               </button>

            </div>

            {/* EMPTY */}
            {!lastItem && (
               <p className="text-center text-gray-400 text-sm">
                  Belum ada transaksi
               </p>
            )}

            {/* LAST ITEM */}
            {lastItem && (
               <div className="space-y-1">

                  <div className="flex justify-between">

                     <p className="font-medium text-sm">
                        {lastItem.nama || "-"}
                     </p>

                     <p className="text-red-500 text-sm">
                        - {formatCurrency(lastItem.harga)}
                     </p>

                  </div>

                  <p className="text-xs text-gray-400">
                     {formatDate(lastItem.created_at)}
                  </p>

               </div>
            )}

         </div>

         {/* SUPERADMIN TOOLS */}
         {isSuperadmin && (
            <div className="space-y-2">
               <button
                  onClick={() => navigate("/app-mobile/user-management")}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl font-semibold active:scale-95 transition"
               >
                  <ShieldCheck size={18} />
                  User Management
               </button>
               <button
                  onClick={() => navigate("/app-mobile/file-share")}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition"
               >
                  <FolderUp size={18} />
                  Berbagi File Sementara
               </button>
            </div>
         )}

         {/* LOGOUT */}
         <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold active:scale-95 transition disabled:opacity-50"
         >
            {loading ? "Loading..." : "Logout"}
         </button>

      </div>

   );

}

export default MobileProfile;