import { useState } from "react";
import { auth, db } from "../../firebase/config";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function LoginPhone() {

    const [phone, setPhone] = useState("");
    const [confirmResult, setConfirmResult] = useState(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    /* ================= FORMAT NOMOR ================= */
    const formatPhone = (num) => {
        let cleaned = num.replace(/\D/g, "");

        if (cleaned.startsWith("0")) {
            cleaned = "62" + cleaned.slice(1);
        }

        if (!cleaned.startsWith("62")) {
            return null;
        }

        return "+" + cleaned;
    };

    /* ================= RECAPTCHA ================= */
    const setupRecaptcha = () => {

        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
        }

        window.recaptchaVerifier = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
                size: "invisible"
            }
        );
    };

    /* ================= KIRIM OTP ================= */
    const sendOTP = async () => {

        const formatted = formatPhone(phone);

        if (!formatted) {
            return alert("Format nomor salah");
        }

        try {

            setLoading(true);

            // 🔥 RESET RECAPTCHA
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
            }

            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                {
                    size: "invisible"
                }
            );

            // 🔥 WAJIB
            await window.recaptchaVerifier.render();


            const result = await signInWithPhoneNumber(
                auth,
                formatted,
                window.recaptchaVerifier
            );

            setConfirmResult(result);

            alert("OTP terkirim");

        } catch (err) {
            console.error("ERROR OTP:", err);
            alert("Gagal kirim OTP");
        } finally {
            setLoading(false);
        }
    };

    /* ================= VERIFIKASI ================= */
    const verifyCode = async () => {
        try {

            if (!code) return alert("Masukkan kode OTP");

            setLoading(true);

            const res = await confirmResult.confirm(code);
            const user = res.user;

            /* 🔥 CEK USER SUDAH ADA ATAU BELUM */
            const snap = await getDoc(doc(db, "users", user.uid));

            const redirect = localStorage.getItem("afterLoginRedirect");

            if (!snap.exists()) {
                // user baru
                window.location.href = "/login";
                return;
            }

            const userData = snap.data();
            if (userData.disabled === true) {
                await signOut(auth);
                alert("Akun Anda telah dinonaktifkan. Hubungi administrator.");
                return;
            }

            /* 🔥 STEP 2 (BALIK KE FORM / HOME) */
            const isSafeRedirect = redirect
              && redirect.startsWith("/")
              && !redirect.startsWith("//")
              && redirect !== "/login"
              && redirect !== "/";
            if (isSafeRedirect) {
                localStorage.removeItem("afterLoginRedirect");
                window.location.href = redirect;
            } else {
                window.location.href = "/";
            }

        } catch (err) {
            console.error(err);
            alert("Kode OTP salah / expired");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="p-6 max-w-md mx-auto">

            <h2 className="text-xl font-bold mb-4 text-center">
                Login Nomor HP
            </h2>

            {/* INPUT NOMOR */}
            <input
                placeholder="0812xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border p-2 w-full mb-3 rounded"
            />

            {/* BUTTON OTP */}
            <button
                onClick={sendOTP}
                disabled={loading}
                className="bg-blue-600 text-white w-full py-2 rounded"
            >
                {loading ? "Mengirim..." : "Kirim OTP"}
            </button>

            <div id="recaptcha-container"></div>

            {/* INPUT OTP */}
            {confirmResult && (
                <>
                    <input
                        placeholder="Kode OTP"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="border p-2 w-full mt-4 rounded"
                    />

                    <button
                        onClick={verifyCode}
                        disabled={loading}
                        className="bg-green-600 text-white w-full py-2 mt-2 rounded"
                    >
                        {loading ? "Verifikasi..." : "Verifikasi"}
                    </button>
                </>
            )}

        </div>
    );
}

export default LoginPhone;