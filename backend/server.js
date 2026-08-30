import express from "express";
import multer from "multer";
import vision from "@google-cloud/vision";
import cors from "cors";

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

const client = new vision.ImageAnnotatorClient({
  keyFilename: "service-account.json",
});

const parseText = (text) => {
  return {
    merk: text.match(/ABB|Schneider|Siemens/i)?.[0] || "",
    type: text.match(/DM1A-SM6|SM6|NXPLUS/i)?.[0] || "",
    no_seri: text.match(/(Serial|No)\s*[:\-]?\s*(\d+)/i)?.[2] || "",
    tegangan: text.match(/(\d+\/\d+\/\d+\s*kV)/i)?.[0] || "",
    arus: text.match(/(\d+\s*A)/i)?.[0] || "",
    breaking_capacity: text.match(/(\d+\s*kA)/i)?.[0] || ""
  };
};

app.post("/scan", upload.single("image"), async (req, res) => {
  try {
    const [result] = await client.documentTextDetection(req.file.path);

    const text = result.fullTextAnnotation?.text || "";

    const parsed = parseText(text);

    res.json({
      raw: text,
      data: parsed
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error scan");
  }
});

app.listen(5000, () => console.log("Server jalan di 5000"));