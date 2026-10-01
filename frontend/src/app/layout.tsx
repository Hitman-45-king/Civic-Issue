import "./globals.css";
import Chatbot from "@/components/Chatbot";

export const metadata = {
  title: "Civic Guard — Municipal Issue Operations",
  description: "Report civic issues, dispatch field teams, and track resolution with SLA compliance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
