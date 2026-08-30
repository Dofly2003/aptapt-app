import { useEffect, useState } from "react";
import { db } from "../../firebase/config";
import {
    collection,
    addDoc,
    onSnapshot,
    serverTimestamp,
    deleteDoc,
    doc,
    getDocs,
    updateDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../../components/ConfirmModal";

function MobileNotes() {

    const [notes, setNotes] = useState([]);
    const [title, setTitle] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const [actionNote, setActionNote] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    const navigate = useNavigate();

    /* ================= REALTIME ================= */
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "technician_notes"),
            (snap) => {
                const data = snap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setNotes(data);
            },
            (err) => {
                console.error("[MobileNotes] onSnapshot error:", err);
            }
        );

        return () => unsub();
    }, []);

    /* ================= ADD ================= */
    const handleAdd = async () => {
        if (!title.trim()) return;

        try {
            const docRef = await addDoc(
                collection(db, "technician_notes"),
                {
                    title: title.trim(),
                    createdAt: serverTimestamp(),
                }
            );

            setTitle("");
            setShowModal(false);

            navigate(`/app-mobile/notes/${docRef.id}`);
        } catch (err) {
            console.error("[MobileNotes] handleAdd error:", err);
            alert("Gagal menambahkan catatan. Silakan coba lagi.");
        }
    };

    /* ================= DELETE ================= */
    const handleDelete = async () => {
        const id = deleteId;

        try {
            const itemsRef = collection(db, "technician_notes", id, "items");
            const snapshot = await getDocs(itemsRef);

            const promises = snapshot.docs.map((d) =>
                deleteDoc(d.ref)
            );

            await Promise.all(promises);

            await deleteDoc(doc(db, "technician_notes", id));

            setDeleteId(null);
        } catch (err) {
            console.error("[MobileNotes] handleDelete error:", err);
            alert("Gagal menghapus catatan. Silakan coba lagi.");
        }
    };

    /* ================= LONG PRESS ================= */
    let pressTimer;

    const handlePressStart = (item) => {
        pressTimer = setTimeout(() => {
            setActionNote(item);
            setEditTitle(item.title);
        }, 500);
    };

    const handlePressEnd = () => {
        clearTimeout(pressTimer);
    };

    return (
        <div className="p-4 space-y-4 pb-32">

            <h1 className="text-lg font-bold">
                Catatan
            </h1>

            {/* ================= LIST ================= */}
            <div className="p-3 space-y-3 pb-28">

                <h1 className="text-base font-semibold">
                    Catatan
                </h1>

                {/* LIST */}
                <div className="space-y-2">

                    {notes.length === 0 && (
                        <div className="text-center text-gray-400 py-8 text-sm">
                            Belum ada catatan
                        </div>
                    )}

                    {notes
                        .filter(n => n.title?.trim())
                        .map(item => (

                            <div
                                key={item.id}
                                className="bg-white rounded-lg shadow-sm active:scale-[0.98] transition"
                                onMouseDown={() => handlePressStart(item)}
                                onMouseUp={handlePressEnd}
                                onTouchStart={() => handlePressStart(item)}
                                onTouchEnd={handlePressEnd}
                                onClick={() => navigate(`/app-mobile/notes/${item.id}`)}
                            >
                                <div className="px-3 py-2 flex items-center justify-between">

                                    <div className="flex-1">
                                        <h2 className="font-medium text-sm text-gray-800 truncate">
                                            {item.title}
                                        </h2>
                                    </div>

                                    <div className="text-gray-300 text-sm ml-2">
                                        ›
                                    </div>

                                </div>
                            </div>

                        ))}

                </div>
            </div>

            {/* ================= FLOATING BUTTON ================= */}
            <button
                onClick={() => setShowModal(true)}
                className="fixed bottom-24 right-5 z-[9999]
        bg-black text-white w-14 h-14
        rounded-2xl shadow-lg
        flex items-center justify-center
        active:scale-90 transition"
            >
                +
            </button>

            {/* ================= MODAL TAMBAH ================= */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end">

                    <div className="bg-white w-full p-4 rounded-t-2xl space-y-3 animate-slideUp">

                        <h2 className="font-bold text-lg">
                            Tambah Catatan
                        </h2>

                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Judul catatan"
                            className="w-full border p-3 rounded-lg"
                        />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full border py-2 rounded-lg"
                            >
                                Batal
                            </button>

                            <button
                                onClick={handleAdd}
                                className="w-full bg-black text-white py-2 rounded-lg"
                            >
                                Simpan
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ================= MODAL ACTION (HOLD) ================= */}
            {actionNote && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end">

                    <div className="bg-white w-full p-4 rounded-t-2xl space-y-3 animate-slideUp">

                        <h2 className="font-bold text-lg text-center">
                            Opsi Catatan
                        </h2>

                        {/* EDIT */}
                        <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full border p-3 rounded-lg"
                        />

                        <button
                            onClick={async () => {
                                try {
                                    await updateDoc(
                                        doc(db, "technician_notes", actionNote.id),
                                        { title: editTitle }
                                    );
                                    setActionNote(null);
                                } catch (err) {
                                    console.error("[MobileNotes] updateTitle error:", err);
                                    alert("Gagal menyimpan perubahan. Silakan coba lagi.");
                                }
                            }}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg"
                        >
                            Simpan Perubahan
                        </button>

                        {/* DELETE */}
                        <button
                            onClick={() => {
                                setDeleteId(actionNote.id);
                                setActionNote(null);
                            }}
                            className="w-full text-red-500 py-2"
                        >
                            Hapus Catatan
                        </button>

                        {/* CANCEL */}
                        <button
                            onClick={() => setActionNote(null)}
                            className="w-full border py-2 rounded-lg"
                        >
                            Batal
                        </button>

                    </div>
                </div>
            )}

            {/* ================= CONFIRM DELETE ================= */}
            <ConfirmModal
                open={!!deleteId}
                title="Hapus Catatan"
                message="Catatan ini akan dihapus permanen"
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
            />

        </div>
    );
}

export default MobileNotes;