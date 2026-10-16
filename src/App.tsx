import { ThemeToggle } from "@/components/ThemeToggle";
import { AcquisitionPanel } from "@/acquisition/AcquisitionPanel";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-[30px] w-[30px] flex-none place-items-center rounded-md bg-gradient-to-br from-primary to-primary/60 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 2v20M4 7l8 5 8-5" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" opacity="0.75" />
              </svg>
            </div>
            <div>
              <div className="font-display text-[15px] font-bold leading-tight tracking-wide">Requirement Gathering System</div>
            </div>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-14 pt-4">
        <AcquisitionPanel />
      </main>
    </div>
  );
}
