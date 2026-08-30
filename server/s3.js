// server/s3.js — helper MinIO/S3 untuk endpoint presigned URL (pilot: prefix inventori/)
const {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const S3_ENDPOINT = process.env.MINIO_ENDPOINT || "https://storage.pt-adytia.com";
const S3_REGION   = process.env.MINIO_REGION || "us-east-1";
const S3_BUCKET   = process.env.MINIO_BUCKET || "adytia-app";

// Prefix yang diizinkan pada fase pilot. Tambah entri di sini saat ekspansi.
const PILOT_PREFIXES = ["inventori/"];

function makeClient(accessKeyId, secretAccessKey) {
  return new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // WAJIB untuk MinIO
  });
}

function isPilotPath(key) {
  if (!key || typeof key !== "string") return false;
  let decoded;
  try { decoded = decodeURIComponent(key); } catch { return false; }
  if (decoded.includes("..") || decoded.includes("\x00") || decoded.startsWith("/")) return false;
  if (key.includes("%")) return false; // tolak sisa encoding / double-encoding
  return PILOT_PREFIXES.some((p) => key.startsWith(p));
}

const presignGet = (c, key, expiresIn) =>
  getSignedUrl(c, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn });

const presignPut = (c, key, contentType, expiresIn) =>
  getSignedUrl(c, new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType }), { expiresIn });

const deleteObject = (c, key) =>
  c.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));

module.exports = { makeClient, isPilotPath, presignGet, presignPut, deleteObject };
