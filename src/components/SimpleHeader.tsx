"use client";

export default function SimpleHeader() {
  return (
    <header className="z-50 bg-blue-600 dark:bg-[#001f3f] text-white shadow">
      <div className="flex justify-center items-center px-6 py-4">
        <div className="h-15 w-auto">
          <img
            src="/logo.svg"
            alt="Who's On Call Logo"
            className="h-full w-auto"
          />
        </div>
      </div>
    </header>
  );
}
