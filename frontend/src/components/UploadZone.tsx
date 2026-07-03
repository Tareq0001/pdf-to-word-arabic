"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { UploadCloud, Loader2, FileText, Copy, Check, Download, Key, Lock } from "lucide-react";

export default function UploadZone() {
  const [status, setStatus] = useState<"IDLE" | "UPLOADING" | "COMPLETED" | "FAILED">("IDLE");
  const [extractedText, setExtractedText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Auth states
  const [authMode, setAuthMode] = useState<"OWN_KEY" | "SITE_PASSWORD">("SITE_PASSWORD");
  const [userApiKey, setUserApiKey] = useState("");
  const [sitePassword, setSitePassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (status !== "UPLOADING") return;
    const interval = setInterval(() => {
      setProgress(prev => {
        // Random jump between 2% and 10% to simulate realistic processing chunks
        const increment = Math.floor(Math.random() * 8) + 2;
        const next = prev + increment;
        return next > 97 ? 97 : next;
      });
    }, 1500); // update every 1500ms
    return () => clearInterval(interval);
  }, [status]);

  const handleVerify = async () => {
    setErrorMsg(null);
    setIsVerifying(true);
    const formData = new FormData();
    if (authMode === "OWN_KEY" && userApiKey.trim()) {
      formData.append("api_key", userApiKey.trim());
    } else if (authMode === "SITE_PASSWORD" && sitePassword.trim()) {
      formData.append("site_password", sitePassword.trim());
    } else {
      setErrorMsg("الرجاء إدخال البيانات المطلوبة.");
      setIsVerifying(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/verify`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `فشل التحقق`);
      }

      setIsAuthenticated(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "حدث خطأ أثناء التحقق.");
    } finally {
      setIsVerifying(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setFileName(file.name);
    setStatus("UPLOADING");
    setProgress(0);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    if (authMode === "OWN_KEY" && userApiKey.trim()) {
      formData.append("api_key", userApiKey.trim());
    } else if (authMode === "SITE_PASSWORD" && sitePassword.trim()) {
      formData.append("site_password", sitePassword.trim());
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/extract`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setExtractedText(data.text || "");
      setStatus("COMPLETED");

    } catch (err: any) {
      console.error(err);
      setStatus("FAILED");
      setErrorMsg(err.message || "An error occurred during extraction.");
    }
  }, [authMode, userApiKey, sitePassword]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!extractedText) return;
    setIsDownloading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/download-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName ? fileName.replace(/\.pdf$/i, ".docx") : "extracted_text.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading docx:", err);
      alert("Failed to download Word file.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === "COMPLETED") {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col lg:flex-row gap-6 items-start h-[70vh] bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 backdrop-blur-sm"
      >
        {/* Left Side: Original File Info / Re-upload */}
        <div className="w-full lg:w-1/3 h-full flex flex-col justify-center items-center bg-slate-800/40 rounded-2xl border border-slate-700/50 p-8 space-y-6">
          <FileText className="w-24 h-24 text-purple-400" />
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-200 mb-2 truncate max-w-[250px]">{fileName}</h3>
            <p className="text-slate-400 text-sm">Extracted successfully by Gemini</p>
          </div>
          <button 
            onClick={() => { setStatus("IDLE"); setExtractedText(""); }}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-medium shadow-lg shadow-purple-500/30 transition-all"
          >
            Upload Another File
          </button>
        </div>

        {/* Right Side: Extracted Text Frame */}
        <div className="w-full lg:w-2/3 h-full flex flex-col bg-slate-950 rounded-2xl border border-slate-700/50 overflow-hidden relative">
          <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-700/50">
            <span className="text-sm font-semibold text-slate-300">Gemini Extracted Text</span>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleDownloadDocx}
                disabled={isDownloading}
                className="flex items-center space-x-2 text-sm px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-md text-blue-300 transition-colors disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isDownloading ? "Downloading..." : "Word (DOCX)"}</span>
              </button>
              <button 
                onClick={handleCopy}
                className="flex items-center space-x-2 text-sm px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
          </div>
          <textarea
            className="flex-1 w-full bg-transparent text-slate-200 p-6 resize-none focus:outline-none leading-relaxed text-center"
            value={extractedText}
            readOnly
            dir="auto"
            style={{ whiteSpace: "pre-wrap" }}
          />
        </div>
      </motion.div>
    );
  }

  if (status === "UPLOADING") {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 rounded-3xl backdrop-blur-md border border-purple-500/30 bg-purple-900/10 flex flex-col items-center space-y-6">
        <Loader2 className="w-20 h-20 text-purple-400 animate-spin" />
        <h3 className="text-2xl font-bold text-purple-100" dir="rtl">جاري العمل...</h3>
        <p className="text-purple-200/60 text-center text-sm" dir="rtl">
          يرجى الانتظار بينما نقوم باستخراج النص من الملف بدقة عالية
        </p>
        <div className="w-full max-w-md h-3 bg-purple-900/50 rounded-full overflow-hidden mt-6 shadow-inner relative">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect inside the bar */}
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        <div className="text-purple-300 font-bold text-xl mt-2 tracking-widest">{progress}%</div>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 rounded-3xl backdrop-blur-md border border-red-500/30 bg-red-900/20 flex flex-col items-center space-y-4">
        <h3 className="text-2xl font-bold text-red-100">Extraction Failed</h3>
        <p className="text-red-200/80 text-center max-w-md">{errorMsg}</p>
        <button 
          onClick={() => setStatus("IDLE")}
          className="mt-6 px-6 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-100 rounded-full transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // LOCK SCREEN STATE
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center space-y-6">
        <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">تسجيل الدخول</h2>
            <p className="text-slate-400 mt-2 text-center text-sm">اختر طريقة الدخول للبدء في استخدام أداة الاستخراج</p>
          </div>

          <div className="flex justify-center mb-6 space-x-2 space-x-reverse" dir="rtl">
            <button
              onClick={() => { setAuthMode("SITE_PASSWORD"); setErrorMsg(null); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center space-x-2 space-x-reverse ${
                authMode === "SITE_PASSWORD" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>كلمة مرور الموقع</span>
            </button>
            <button
              onClick={() => { setAuthMode("OWN_KEY"); setErrorMsg(null); }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center space-x-2 space-x-reverse ${
                authMode === "OWN_KEY" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>مفتاح API الخاص</span>
            </button>
          </div>

          <div className="relative mb-6" dir="rtl">
            {authMode === "SITE_PASSWORD" ? (
              <input
                type="text"
                placeholder="أدخل كلمة مرور الموقع..."
                value={sitePassword}
                onChange={(e) => setSitePassword(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-center font-mono text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            ) : (
              <input
                type="text"
                placeholder="AIzaSy..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-600 text-slate-200 rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-center font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            )}
          </div>
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-red-400 text-sm" 
              dir="rtl"
            >
              {errorMsg}
            </motion.div>
          )}

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 flex justify-center items-center"
          >
            {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : "تأكيد الدخول"}
          </button>
        </div>
      </div>
    );
  }

  // IDLE State (Authenticated)
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6">
      <div 
        {...getRootProps()} 
        className={`w-full p-16 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 backdrop-blur-md ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-500/50 bg-slate-800/40 hover:bg-slate-800/60'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <UploadCloud className="w-20 h-20 text-purple-400" />
          </motion.div>
          <h3 className="text-2xl font-semibold text-slate-200" dir="rtl">اسحب وأفلت ملف الـ PDF هنا</h3>
          <p className="text-slate-400" dir="rtl">أو اضغط لاختيار الملف للبدء بالاستخراج</p>
        </div>
      </div>
    </div>
  );
}
