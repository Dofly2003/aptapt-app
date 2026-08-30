import CameraButton from "./CameraButton";

export default function FormSection({
    partKey,
    fields,
    form,
    photos,
    handleChange,
    handlePhoto,
    removePhoto,
    isSurvey = false
}) {
    return (
        <>
            {Object.keys(fields).map(section => (
                <div key={section} className="bg-white rounded-2xl shadow-sm border p-3 w-full">

                    {/* HEADER */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 flex items-center justify-center rounded-lg text-xs">
                            ⚡
                        </div>
                        <h3 className="text-sm font-semibold capitalize text-gray-700 truncate">
                            {section.replace("_", " ")}
                        </h3>
                    </div>

                    <div className="space-y-2">

                        {fields[section].map((f) => {

                            const key = `${section}_${f}`;
                            const inputId = `${partKey}_${key}`;
                            const current = Array.isArray(photos?.[partKey]?.[key])
                                ? photos[partKey][key]
                                : [];

                            return (
                                <div key={key} className="bg-slate-50 border rounded-xl p-2 space-y-2 w-full">

                                    {/* ROW */}
                                    <div className="flex items-center gap-2 w-full overflow-hidden">

                                        {/* LEFT */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">

                                            <span className="text-xs min-w-[70px] shrink-0">
                                                {f}
                                            </span>

                                            {(!isSurvey ||
                                                section === "jarak_phb_tm" ||
                                                section === "jarak_trafo" ||
                                                section === "suhu_phb_tm") && (
                                                    <>
                                                        <input
                                                            className="flex-1 min-w-0 bg-white border rounded-lg px-2 py-1 text-sm"
                                                            value={form?.[partKey]?.[section]?.[f] || ""}
                                                            onChange={(e) =>
                                                                handleChange(partKey, section, f, e.target.value)
                                                            }
                                                            placeholder="Isi..."
                                                        />

                                                        {/* satuan khusus */}
                                                        {section === "suhu_phb_tm" && (
                                                            <span className="text-xs shrink-0">°C</span>
                                                        )}

                                                        {(section === "jarak_phb_tm" || section === "jarak_trafo") && (
                                                            <span className="text-xs shrink-0">cm</span>
                                                        )}

                                                        {!isSurvey &&
                                                            section !== "jarak_phb_tm" &&
                                                            section !== "jarak_trafo" &&
                                                            section !== "suhu_phb_tm" && (
                                                                <span className="text-xs shrink-0">MΩ</span>
                                                            )}
                                                    </>
                                                )}

                                        </div>

                                        {/* CAMERA */}
                                        <CameraButton
                                            onChange={(e) => handlePhoto(partKey, key, e)}
                                            captureEnv={true}
                                            className="bg-gray-600 hover:bg-gray-700 active:scale-95 text-white p-2 rounded-lg cursor-pointer transition flex-shrink-0 shadow-sm"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path d="M3 7h4l2-2h6l2 2h4v12H3V7z" />
                                                <circle cx="12" cy="13" r="4" />
                                            </svg>
                                        </CameraButton>
                                    </div>

                                    {/* INFO */}
                                    <p className={`text-[11px] ${current.length < (isSurvey ? 1 : 2)
                                        ? "text-red-500"
                                        : "text-green-600"
                                        }`}>
                                        {current.length} / {isSurvey ? 1 : 2} foto
                                    </p>

                                    {/* PREVIEW */}
                                    {current.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 w-full">
                                            {current.map((p, idx) => (
                                                <div key={idx} className="relative w-full">
                                                    {typeof p === "string" && (
                                                        <img
                                                            src={p}
                                                            className="h-16 w-full object-cover rounded"
                                                        />
                                                    )}

                                                    <button
                                                        onClick={() => removePhoto(partKey, key, idx)}
                                                        className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 rounded"
                                                    >
                                                        x
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>
                            );
                        })}

                    </div>

                </div>
            ))}
        </>
    );
}