// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full mt-16 py-4 text-center text-sm text-white bg-blue-600 dark:bg-[#001f3f] border-t border-blue-600 dark:border-[#001f3f]">
      © {new Date().getFullYear()} Who's On Call · All rights reserved.
    </footer>
  );
}
