const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Ce compte GitHub n'est pas autorisé.",
  state_mismatch: 'La connexion a expiré. Recommence depuis cette page.',
  please_restart_the_process: 'La connexion a expiré. Recommence depuis cette page.',
};

const FALLBACK_MESSAGE = 'La connexion a échoué. Réessaie dans un instant.';

export async function LoginError({
  searchParams,
}: {
  searchParams: PageProps<'/login'>['searchParams'];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  const code = Array.isArray(error) ? error[0] : error;
  const message = ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
  return (
    <div role="alert" className="rounded-control border border-danger px-4 py-3">
      <p className="font-semibold">Connexion impossible</p>
      <p className="text-body-14 text-fg-2">{message}</p>
    </div>
  );
}
