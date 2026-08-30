import { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

function TableAkun({ onEdit }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "akun_credentials"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setData(result);
    });

    return () => unsub();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Data Akun</h2>

      <div className="overflow-x-auto">
        <table className="w-full border rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Nama</th>
              <th className="p-2">Kategori</th>
              <th className="p-2">Kota</th>
              <th className="p-2">Username</th>
              <th className="p-2">Password</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {data.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.namaAkun}</td>
                <td className="p-2">{item.kategori}</td>
                <td className="p-2">{item.kota}</td>
                <td className="p-2">{item.username}</td>
                <td className="p-2">••••••</td>
                <td className="p-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableAkun;