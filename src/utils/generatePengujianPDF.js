import jsPDF from "jspdf";

// 🔥 helper convert image url → base64
const toBase64 = async (url) => {
    try {
        // 🔥 kalau blob (preview lokal)
        if (url.startsWith("blob:")) {
            const res = await fetch(url);
            const blob = await res.blob();

            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }

        // 🔥 kalau dari firebase (http)
        if (url.startsWith("http")) {
            const res = await fetch(url);
            const blob = await res.blob();

            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }

        return null;

    } catch (err) {
        console.error("Gagal convert image:", url);
        return null;
    }
};

export const generatePengujianPDF = async (item) => {
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(14);
    doc.text("LAPORAN PENGUJIAN", 10, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Nama: ${item.nama || "-"}`, 10, y);
    y += 8;

    const form = item.formData || {};
    const photos = item.photos || {};

    const surveyFields = {
        phb_tm: ["Nameplate", "Pengoperasian", "Fuse", "CB", "CT", "Grounding"],
        jarak_phb_tm: ["Kiri", "Kanan", "Depan", "Belakang"],
        suhu_phb_tm: ["R", "S", "T"],
        trafo: ["Foto", "Grounding", "Netral", "DGPT", "Kran", "Kaki"],
        jarak_trafo: ["Kiri", "Kanan", "Depan", "Belakang"],
        lvmdp: ["Panel", "Pengaman", "Putaran"],
        phb_tr: ["Kiri", "Kanan", "Depan", "Belakang"]
    };

    const testFields = {
        trafo_primer: ["R-Gnd", "S-Gnd", "T-Gnd", "R-S", "R-T", "S-T"],
        trafo_skunder: ["R-Gnd", "S-Gnd", "T-Gnd", "R-S", "R-T", "S-T"],
        kabel_tm: ["R-Gnd", "S-Gnd", "T-Gnd", "R-S", "R-T", "S-T"]
    };

    // ================= SURVEY =================
    for (let section of Object.keys(surveyFields)) {
        doc.setFont(undefined, "bold");
        doc.text(section.replace("_", " "), 10, y);
        y += 6;

        doc.setFont(undefined, "normal");

        for (let f of surveyFields[section]) {
            const val = form?.part1?.[section]?.[f] || "-";
            doc.text(`${f}: ${val}`, 12, y);
            y += 5;

            // 🔥 ambil foto
            const key = `${section}_${f}`;
            const imgs = photos?.part1?.[key] || [];

            for (let img of imgs) {
                const base64 = await toBase64(img);
                if (!base64) continue;

                if (y > 250) {
                    doc.addPage();
                    y = 10;
                }

                doc.addImage(base64, "JPEG", 12, y, 60, 40);
                y += 45;
            }

            if (y > 280) {
                doc.addPage();
                y = 10;
            }
        }

        y += 3;
    }

    // ================= PENGUJIAN =================
    for (let section of Object.keys(testFields)) {
        doc.setFont(undefined, "bold");
        doc.text(section.replace("_", " "), 10, y);
        y += 6;

        doc.setFont(undefined, "normal");

        for (let f of testFields[section]) {
            const val = form?.part2?.[section]?.[f] || "-";
            doc.text(`${f}: ${val} MΩ`, 12, y);
            y += 5;

            const key = `${section}_${f}`;
            const imgs = photos?.part2?.[key] || [];

            for (let img of imgs) {
                if (!img) continue;

                const base64 = await toBase64(img);
                if (!base64) continue;

                if (y > 250) {
                    doc.addPage();
                    y = 10;
                }

                doc.addImage(base64, "JPEG", 12, y, 60, 40);
                y += 45;
            }

            if (y > 280) {
                doc.addPage();
                y = 10;
            }
        }

        y += 3;
    }

    doc.save(`pengujian-${item.nama || item.id}.pdf`);
};