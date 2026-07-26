import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="w-16 h-16 rounded-2xl mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold">Nemscreening</h1>
          <p className="text-muted mt-1">Log ind for at komme i gang</p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm"
          >
            {error}
          </p>
        )}

        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? "/sager"} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">E-mail</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              className="tap rounded-lg border border-border bg-surface px-3 py-2.5"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Kodeord</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="tap rounded-lg border border-border bg-surface px-3 py-2.5"
            />
          </label>

          <button
            type="submit"
            className="tap mt-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-fg active:bg-primary-hover"
          >
            Log ind
          </button>
        </form>
      </div>
    </main>
  );
}
