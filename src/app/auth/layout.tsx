import { Roboto_Mono } from "next/font/google";
import { Toaster } from "sonner";

const robotoMono = Roboto_Mono({
    variable: "--font-roboto-mono",
    subsets: ["latin"],
});

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={robotoMono.variable + " antialiased"}>
            {children}
            <Toaster position="top-center" />
        </div>
    );
}