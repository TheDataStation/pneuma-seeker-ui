import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="panel w-full max-w-lg rounded-[32px] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate/70">
          Pneuma Seeker
        </p>
        <h1 className="font-display mt-2 text-3xl">Create your workspace</h1>
        <p className="mt-2 text-sm text-slate/70">
          Start with the demo account or onboard a new team.
        </p>
        <form className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
              Name
            </label>
            <input
              type="text"
              placeholder="Full name"
              className="w-full rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
              Email
            </label>
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
              Workspace
            </label>
            <input
              type="text"
              placeholder="Research team"
              className="w-full rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-2xl bg-sea px-4 py-3 text-sm font-semibold text-white"
          >
            Create workspace
          </button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm text-slate/70">
          <Link className="hover:text-ink" href="/login">
            Already have an account?
          </Link>
          <Link className="hover:text-ink" href="/">
            Back to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
