import { Button } from '@/components/ui/button';

export default function StyleguidePage() {
  return (
    <main id="content" className="mx-auto flex max-w-300 flex-col gap-12 p-8">
      <h1 className="font-display text-display-30">Styleguide</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-label-12 text-fg-3 uppercase">Boutons</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-card bg-surface-default p-4">
          <Button variant="primary">Reprendre le cours</Button>
          <Button>Postulé</Button>
          <Button variant="ghost">Détail</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </section>
    </main>
  );
}
