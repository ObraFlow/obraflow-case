import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";

// Layout das telas do produto. O header lê o cookie "Agindo como" dentro dos próprios
// <Suspense>, então este layout pode ser estático.
export default function TelasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
        {children}
      </main>
      <Toaster position="bottom-right" containerAriaLabel="Notificações" />
    </>
  );
}
