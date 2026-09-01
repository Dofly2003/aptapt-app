import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import jsPDF from "jspdf";
import { useLoading } from "../../context/LoadingContext";
import autoTable from "jspdf-autotable";
import { useReactToPrint } from "react-to-print";
import { inlineImgsForPrint } from "../../utils/inlineImgsForPrint";
import { generateHasilPengujianPDF } from "../../utils/generateHasilPengujianPDF";
export default function LaporanPengujianWeb() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    const { startLoading, stopLoading } = useLoading();

    const printRef = useRef();

    const restoreImgs = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `laporan-${data?.nama || "pengujian"}`,
        onBeforePrint: async () => {
            if (printRef.current) restoreImgs.current = await inlineImgsForPrint(printRef.current);
        },
        onAfterPrint: () => {
            restoreImgs.current?.();
            restoreImgs.current = null;
        },
    });

    // ================= REALTIME =================
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "pengujian", id), (snap) => {
            if (snap.exists()) {
                setData(snap.data());
            }
        });

        return () => unsub();
    }, [id]);

    if (!data) return <div className="p-10 text-center">Loading...</div>;

    const form = data.formData || {};
    const photos = data.photos || {};

    // ================= EXPORT PDF =================
    const loadImage = (url) =>
        new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });

    
    // Helper pencarian gambar agar tidak error jika key sedikit berbeda
    const getPhotos = (part, section, key) => {
        const partPhotos = photos[part] || {};
        if (partPhotos[`${section}_${key}`]) return partPhotos[`${section}_${key}`];
        if (partPhotos[key]) return partPhotos[key];
        return [];
    };
    const handleExport = async () => {
        startLoading("Membuat PDF...");

        try {
            await generateHasilPengujianPDF(data, form, photos); // ✅ pakai yang baru
        } catch (err) {
            console.error(err);
            alert("Gagal export");
        } finally {
            stopLoading();
        }
    };;
    const SectionBlock = ({ title, images = [], specs = {} }) => {
        return (
            <table className="w-full border border-black text-xs mb-4">
                <tbody>

                    {/* JUDUL + FOTO */}
                    <tr>
                        <td className="border w-1/4 p-2 align-top">
                            ➤ {title}
                        </td>

                        <td className="border p-2">
                            <div style={{ textAlign: "center" }} className="grid grid-cols-2 gap-2">
                                {images.length > 0 ? (
                                    images.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img}
                                            crossOrigin="anonymous"
                                            style={{
                                                width: "120px",
                                                height: "120px",
                                                objectFit: "contain",
                                                margin: "5px auto",
                                                display: "block"
                                            }}
                                        />
                                    ))
                                ) : (
                                    <span className="text-gray-400 italic">Tidak ada foto</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* DETAIL */}
                    {Object.entries(specs).map(([key, val]) => (
                        <tr key={key}>
                            <td className="border px-2">{key}</td>
                            <td className="border px-2">: {val || "-"}</td>
                        </tr>
                    ))}

                </tbody>
            </table>
        );
    };
    return (
        <div className="bg-gray-100 min-h-screen p-6">
            {/* 🔥 ACTION BAR */}
            <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">Monitoring Laporan</h1>
                <button
                    onClick={handleExport}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                >
                    Export PDF
                </button>
            </div>

            {/* 🔥 TEMPLATE */}
            <div ref={printRef} className="pdf-container bg-white max-w-4xl mx-auto p-6 text-[12px] leading-relaxed">

                <div
                    className="pdf-page"
                    style={{
                        width: "794px",
                        margin: "0 auto",
                        padding: "20px",
                        background: "#fff",
                        fontFamily: "Times New Roman",
                        fontSize: "12px",
                        color: "#000",
                    }}
                >

                    {/* ================= HEADER ================= */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "10px" }}>
                        <tbody>
                            <tr>
                                <td style={{ border: "1px solid black", width: "120px", textAlign: "center" }}>
                                    <img src="/logo.png" style={{ height: "50px" }} />
                                </td>

                                <td style={{ border: "1px solid black", textAlign: "center", fontWeight: "bold" }}>
                                    BERITA ACARA PEMERIKSAAN PHB TM PADA INSTALASI MILIK PELANGGAN (IML)
                                </td>

                                <td style={{ border: "1px solid black", textAlign: "center", fontSize: "11px" }}>
                                    PT. ADYTIA PUTRA TEHNIK<br />
                                    Desa Gading Watu RT.04 RW.04<br />
                                    Menganti - Gresik
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ================= PARAGRAF ================= */}
                    <p style={{ marginBottom: "10px" }}>
                        Pada hari ini telah melaksanakan pemeriksaan PHB TM pada instalasi milik pelanggan oleh petugas PT. ADYTIA PUTRA TEHNIK.
                    </p>

                    {/* ================= IDENTITAS ================= */}
                    <table style={{ marginBottom: "20px" }}>
                        <tbody>
                            <tr><td>Nama Pelanggan</td><td>: {data.nama}</td></tr>
                            <tr><td>Alamat</td><td>: {data.alamat || "-"}</td></tr>
                            <tr><td>Daya</td><td>: {data.daya || "-"}</td></tr>
                            <tr><td>Tarif</td><td>: {data.tarif || "-"}</td></tr>
                            <tr><td>IDPEL</td><td>: {data.idpel || "-"}</td></tr>
                        </tbody>
                    </table>

                    {/* ================= FOTO AWAL ================= */}
                    <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                        PEMERIKSAAN PHBTM / KUBIKEL
                    </h3>

                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
                        {(photos?.part1?.phb_tm_Nameplate || []).map((img, i) => (
                            <img
                                key={i}
                                src={img}
                                crossOrigin="anonymous"
                                style={{
                                    width: "120px",
                                    height: "120px",
                                    objectFit: "contain",
                                    margin: "5px auto",
                                    display: "block"
                                }}
                            />
                        ))}
                    </div>

                    {/* ================= NAMEPLATE ================= */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "15px" }}>
                        <tbody>

                            <tr>
                                <td style={{ border: "1px solid black", width: "25%", padding: "8px", fontWeight: "bold", verticalAlign: "top" }}>
                                    ➤ Nameplate PHB TM OUTGOING
                                </td>

                                <td style={{ border: "1px solid black", padding: "8px" }}>
                                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                        {(photos?.part1?.phb_tm_Nameplate || []).map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                crossOrigin="anonymous"
                                                style={{
                                                    width: "120px",
                                                    height: "120px",
                                                    objectFit: "contain",
                                                    margin: "5px auto",
                                                    display: "block"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </td>
                            </tr>

                            {[
                                ["Merk", form?.part1?.phb_tm?.Merk],
                                ["Type", form?.part1?.phb_tm?.Type],
                                ["No Seri", form?.part1?.phb_tm?.NoSeri],
                                ["Tahun", form?.part1?.phb_tm?.Tahun],
                                ["Tegangan", form?.part1?.phb_tm?.Tegangan],
                                ["Arus", form?.part1?.phb_tm?.Arus],
                                ["Breaking Capacity", form?.part1?.phb_tm?.BreakingCapacity],
                                ["Power Heater", form?.part1?.phb_tm?.PowerHeater],
                            ].map(([label, value], i) => (
                                <tr key={i}>
                                    <td style={{ border: "1px solid black", padding: "6px", width: "30%" }}>{label}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>: {value || "-"}</td>
                                </tr>
                            ))}

                        </tbody>
                    </table>

                    {/* ================= PENGOPERASIAN ================= */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black", marginBottom: "15px" }}>
                        <tbody>
                            <tr>
                                <td style={{ border: "1px solid black", width: "25%", padding: "8px", fontWeight: "bold" }}>
                                    ➤ Pengoperasian LBS
                                </td>

                                <td style={{ border: "1px solid black", padding: "8px" }}>
                                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                        {(photos?.part1?.phb_tm_Pengoperasian || []).map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                crossOrigin="anonymous"
                                                style={{
                                                    height: "110px",
                                                    objectFit: "contain",
                                                    maxWidth: "200px",
                                                    border: "1px solid black"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ================= FUSE ================= */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid black" }}>
                        <tbody>

                            <tr>
                                <td style={{ border: "1px solid black", width: "25%", padding: "8px", fontWeight: "bold" }}>
                                    ➤ Nameplate FUSE (RELAY)
                                </td>

                                <td style={{ border: "1px solid black", padding: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "center" }}>
                                        {(photos?.part1?.phb_tm_Fuse || []).map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                crossOrigin="anonymous"
                                                style={{
                                                    height: "110px",
                                                    objectFit: "contain",
                                                    maxWidth: "200px",
                                                    border: "1px solid black"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </td>
                            </tr>

                            {[
                                ["Merk", form?.part1?.fuse?.Merk],
                                ["Type", form?.part1?.fuse?.Type],
                                ["No Seri", form?.part1?.fuse?.NoSeri],
                                ["Tahun", form?.part1?.fuse?.Tahun],
                                ["Tegangan", form?.part1?.fuse?.Tegangan],
                            ].map(([label, value], i) => (
                                <tr key={i}>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{label}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>: {value || "-"}</td>
                                </tr>
                            ))}

                        </tbody>
                    </table>

                    {/* ================= FOOTER ================= */}
                    <div style={{ marginTop: "50px", textAlign: "right" }}>
                        <p>________________________</p>
                        <p>Teknisi</p>
                    </div>

                </div>

            </div>
        </div>
    );

}
