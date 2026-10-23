import { PaletteTrigger } from '@/components/palette/command-palette';

// Top of every page: uppercase breadcrumb + one computed sentence as the title, and the
// ⌘K palette trigger.
export function PageHeader({ breadcrumb, title }: { breadcrumb: string; title: string }) {
  return (
    <header className="flex min-h-13 items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-label-12 text-fg-3 uppercase">{breadcrumb}</p>
        <h1 className="font-display text-display-24 md:truncate">{title}</h1>
      </div>
      <PaletteTrigger />
    </header>
  );
}
