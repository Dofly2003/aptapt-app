import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/config";

import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from "firebase/firestore";

function MobileNoteDetail() {

  const { noteId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [actionItem, setActionItem] = useState(null);
  const [title, setTitle] = useState("Material");

  /* ================= LONG PRESS REF ================= */
  const pressTimer = useRef(null);
  const isMoving = useRef(false);

  /* ================= TITLE ================= */
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        const ref = doc(db, "technician_notes", noteId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const full = snap.data().title || "";
          const first = full.split(" ")[0];

          const clean =
            first.charAt(0).toUpperCase() + first.slice(1);

          setTitle(clean || "Material");
        }
      } catch (err) {
        console.error("[MobileNoteDetail] fetchTitle error:", err);
      }
    };

    fetchTitle();
  }, [noteId]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    const ref = collection(
      db,
      "technician_notes",
      noteId,
      "items"
    );

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setItems(
          snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      },
      (err) => {
        console.error("[MobileNoteDetail] onSnapshot error:", err);
      }
    );

    return () => unsub();
  }, [noteId]);

  /* ================= ADD ================= */
  const handleAddRow = async () => {
    try {
      await addDoc(
        collection(db, "technician_notes", noteId, "items"),
        {
          name: "",
          qty: 0,
          note: "",
          checked: false,
        }
      );
    } catch (err) {
      console.error("[MobileNoteDetail] handleAddRow error:", err);
      alert("Gagal menambahkan baris. Silakan coba lagi.");
    }
  };

  /* ================= UPDATE ================= */
  const updateField = async (id, field, value) => {
    const ref = doc(
      db,
      "technician_notes",
      noteId,
      "items",
      id
    );

    try {
      await updateDoc(ref, { [field]: value });
    } catch (err) {
      console.error("[MobileNoteDetail] updateField error:", err);
      alert("Gagal menyimpan perubahan. Silakan coba lagi.");
    }
  };

  /* ================= CHECK ================= */
  const toggleCheck = async (item) => {
    const ref = doc(
      db,
      "technician_notes",
      noteId,
      "items",
      item.id
    );

    try {
      await updateDoc(ref, {
        checked: !item.checked
      });
    } catch (err) {
      console.error("[MobileNoteDetail] toggleCheck error:", err);
      alert("Gagal mengubah status item. Silakan coba lagi.");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    try {
      await deleteDoc(
        doc(db, "technician_notes", noteId, "items", id)
      );
      setActionItem(null);
    } catch (err) {
      console.error("[MobileNoteDetail] handleDelete error:", err);
      alert("Gagal menghapus item. Silakan coba lagi.");
    }
  };

  /* ================= LONG PRESS ================= */
  const handlePressStart = (item) => {
    isMoving.current = false;

    pressTimer.current = setTimeout(() => {
      if (!isMoving.current) {
        navigator.vibrate?.(30);
        setActionItem(item);
      }
    }, 500);
  };

  const handlePressMove = () => {
    isMoving.current = true;
    clearTimeout(pressTimer.current);
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer.current);
  };

  return (
    <div className="pb-32">

      {/* HEADER */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3">

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            ←
          </button>

          <h1 className="font-bold text-lg">
            Checklist {title}
          </h1>
        </div>

        <div className="h-[1px] bg-gray-200 mt-2"></div>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm">

        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="p-3 w-8"></th>
            <th className="p-3 text-left">{title}</th>
            <th className="p-3 text-left w-16">Qty</th>
            <th className="p-3 text-left">Catatan</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => {

            const isChecked = item.checked;

            return (
              <tr
                key={item.id}
                className={`border-t transition cursor-pointer
                ${isChecked ? "bg-green-50 border-l-4 border-green-500" : ""}`}

                onClick={() => toggleCheck(item)}

                onTouchStart={() => handlePressStart(item)}
                onTouchMove={handlePressMove}
                onTouchEnd={handlePressEnd}

                onMouseDown={() => handlePressStart(item)}
                onMouseUp={handlePressEnd}
              >

                {/* CHECK */}
                <td className="p-3 text-center">
                  {isChecked && "✓"}
                </td>

                {/* NAME */}
                <td className="p-3">
                  <input
                    value={item.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateField(item.id, "name", e.target.value)
                    }
                    className="w-full outline-none bg-transparent"
                  />
                </td>

                {/* QTY */}
                <td className="p-3">
                  <input
                    type="number"
                    value={item.qty}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateField(item.id, "qty", Number(e.target.value))
                    }
                    className="w-full outline-none bg-transparent"
                  />
                </td>

                {/* NOTE */}
                <td className="p-3">
                  <input
                    value={item.note}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateField(item.id, "note", e.target.value)
                    }
                    className="w-full outline-none bg-transparent"
                  />
                </td>

              </tr>
            );
          })}
        </tbody>

      </table>

      {/* ADD BUTTON */}
      <button
        onClick={handleAddRow}
        className="fixed bottom-24 right-5 bg-black text-white w-14 h-14 rounded-xl flex items-center justify-center active:scale-90"
      >
        +
      </button>

      {/* POPUP */}
      {actionItem && (
        <div
          className="fixed inset-0 bg-black/40 z-[9999] flex items-end"
          onClick={() => setActionItem(null)}
        >

          <div
            className="bg-white w-full rounded-t-2xl p-4 space-y-3 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >

            <h2 className="text-center font-semibold text-gray-700">
              Opsi Item
            </h2>

            <button
              onClick={() => handleDelete(actionItem.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl active:bg-red-50"
            >
              <span className="text-red-500 text-xl">🗑️</span>
              <span className="text-sm font-medium text-red-500">
                Hapus
              </span>
            </button>

            <button
              onClick={() => setActionItem(null)}
              className="w-full border p-3 rounded-xl text-sm font-medium"
            >
              Batal
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default MobileNoteDetail;