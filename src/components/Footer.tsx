// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full border-t mt-16 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      © {new Date().getFullYear()} Who's On Call · All rights reserved.
    </footer>
  );
}