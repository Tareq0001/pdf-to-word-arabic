import UploadZone from "@/components/UploadZone";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500/30 overflow-hidden relative">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 py-20 relative z-10 flex flex-col min-h-screen">
        
        {/* Header Section */}
        <header className="text-center mb-16 space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium tracking-wide mb-4 backdrop-blur-sm">
            أداة استخراج النصوص الذكية
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight rtl:leading-tight pb-2" dir="rtl">
            موقع تحويل <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">الـ PDF إلى Word</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mt-6" dir="rtl">
            قم برفع ملفك وسنقوم باستخراج النصوص العربية بدقة عالية وفي ثوانٍ معدودة.
          </p>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <UploadZone />
        </div>
        
        {/* Footer */}
        <footer className="mt-20 text-center text-slate-500 pb-8">
          <p className="text-lg font-medium text-purple-300/80">إهداء من أ.طارق إلى أ.علي</p>
        </footer>
      </div>
    </main>
  );
}
