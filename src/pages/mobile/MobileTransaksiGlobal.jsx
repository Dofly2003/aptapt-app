import { useEffect, useState } from "react";
import { db, auth } from "../../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

function MobileTransaksiGlobal() {

  const user = auth.currentUser;
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "items_global"),
      where("user_uid", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        let result = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // SORT MANUAL TERBARU
        result.sort((a, b) => {
          const aTime = a.created_at?.seconds || 0;
          const bTime = b.created_at?.seconds || 0;
          return bTime - aTime;
        });

        setData(result);
      },
      (err) => {
        console.error("[MobileTransaksiGlobal] onSnapshot error:", err);
      }
    );

    return () => unsub();
  }, [user]);

  const formatCurrency = (num) =>
    "Rp " + (num || 0).toLocaleString();

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date.seconds * 1000).toLocaleDateString("id-ID");
  };

  return (
    <div className="p-4 pb-32 space-y-4">

      <h1 className="text-lg font-bold">
        Semua Transaksi
      </h1>

      {/* EMPTY */}
      {data.length === 0 && (
        <p className="text-center text-gray-400">
          Belum ada transaksi
        </p>
      )}

      {/* ================= TABLE ================= */}
      {data.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl shadow">

          <table className="w-full text-sm">

            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3 text-left">Tanggal</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-right">Harga</th>
              </tr>
            </thead>

            <tbody>

              {data.map((item) => (
                <tr
                  key={item.id}
                  className="border-t hover:bg-gray-50 transition"
                >

                  {/* TANGGAL */}
                  <td className="p-3 text-gray-500">
                    {formatDate(item.created_at)}
                  </td>

                  {/* NAMA */}
                  <td className="p-3 font-medium">
                    {item.nama || "-"}
                  </td>

                  {/* HARGA */}
                  <td className="p-3 text-right text-red-500 font-semibold">
                    {formatCurrency(item.harga)}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}

export default MobileTransaksiGlobal;