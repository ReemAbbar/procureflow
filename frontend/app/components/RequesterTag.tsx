import { personaByName, ROLE_AVATAR } from '../lib/roles';

// Small "submitted by" chip; highlights the current user's own requests.
export default function RequesterTag({ name, isYou }: { name?: string; isYou?: boolean }) {
  if (!name) return null;
  const persona = personaByName(name);
  const initials = persona?.initials ?? name.slice(0, 2).toUpperCase();
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs ${
        isYou ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' : 'bg-slate-100 text-slate-600'
      }`}
      title={persona ? `${name} · ${persona.label}` : name}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white ${
          persona ? ROLE_AVATAR[persona.role] : 'bg-slate-400'
        }`}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="truncate">
        <span className="sr-only">Submitted by </span>
        {name}
        {isYou && <span className="font-medium"> (you)</span>}
      </span>
    </span>
  );
}
