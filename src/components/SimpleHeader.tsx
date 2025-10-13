"use client";
import Image from "next/image";

export default function SimpleHeader() {
  return (
    <header className="z-50 bg-blue-600 dark:bg-[#001f3f] text-white shadow">
      <div className="flex justify-center items-center px-6 py-4">
        <div className="h-15 w-auto">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={160}
            height={40}
            className="w-full h-auto"
          />
        </div>
      </div>
    </header>
  );
}
