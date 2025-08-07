import SimpleHeader from '@/components/SimpleHeader';

export default function Home() {
  return (
    <>
      <SimpleHeader />
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
        <h1 className="text-4xl font-bold mb-4">Welcome to Who's On Call</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Navigate using the top menu to view the on-call schedule, directory, or login.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
        >
          Go to Login
        </a>
        <a
          href={`mailto:support@premuss.org?subject=Request%20Access%20to%20Who's%20On%20Call&body=Hello,%0D%0A%0D%0AI would like to request access to the Who's On Call platform.%0D%0A%0D%0AFull Name:%0D%0AEmail:%0D%0APhone Number:%0D%0AI am requesting access to (please choose one): Viewer / Scheduler / Both%0D%0A%0D%0AThank you.`}
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
        >
          Request Access
        </a>
      </main>
    </>
  );
}
