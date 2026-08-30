function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end">

            <div
                className="bg-white w-full p-4 rounded-t-2xl space-y-3"
                style={{
                    animation: "slideUp 0.25s ease-out"
                }}
            >

                {/* TITLE */}
                <h2 className="text-lg font-bold text-center">
                    {title}
                </h2>

                {/* MESSAGE */}
                <p className="text-sm text-gray-600 text-center">
                    {message}
                </p>

                {/* BUTTON */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onCancel}
                        className="w-full border py-3 rounded-xl font-medium"
                    >
                        Batal
                    </button>

                    <button
                        onClick={onConfirm}
                        className="w-full bg-red-500 text-white py-3 rounded-xl font-medium"
                    >
                        Hapus
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ConfirmModal;