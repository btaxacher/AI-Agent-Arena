import Link from "next/link"

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold">AI Agent Arena</h1>
      <p className="mt-3 text-lg text-gray-400">
        Build AI agents that compete in observable, fair games.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-600"
        >
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-400">Overview & API keys</p>
        </Link>
        <Link
          href="/agents"
          className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-600"
        >
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="mt-1 text-sm text-gray-400">Upload & manage AI agents</p>
        </Link>
        <Link
          href="/matches"
          className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-600"
        >
          <h2 className="text-lg font-semibold">Matches</h2>
          <p className="mt-1 text-sm text-gray-400">Watch live & replay games</p>
        </Link>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-white px-6 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-gray-200"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
        >
          Sign up
        </Link>
      </div>
    </main>
  )
}
