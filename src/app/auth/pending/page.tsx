// Server Component (App Router)
export default function PendingApprovalPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@premuss.org";

  const subject = "user signup who's on call follow up";
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;

  return (

    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <section className="max-w-2xl text-center">
        <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Pending approval
        </h1>
        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300">
          We have received your signup application. Your application will be
          reviewed for approval within 24&nbsp;hrs. If there is no response
          you can follow up by contacting us through email.&nbsp;
          <a href={mailto} className="text-blue-600 hover:underline">
            Contact us
          </a>
          .
        </p>

        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          (Subject will be pre‑filled as “user signup who&apos;s on call
          follow up”)
        </div>
      </section>
    </main>

  );
}
