export default function NotFound() {
  return (
    <main className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-gray-500">The page you are looking for does not exist or is not published yet.</p>
      <a href="/" className="text-sm text-blue-600 underline hover:text-blue-800">
        Go home
      </a>
    </main>
  );
}
