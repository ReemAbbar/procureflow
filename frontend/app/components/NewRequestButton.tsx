import Link from 'next/link';
import { PlusIcon } from './icons';

export default function NewRequestButton() {
  return (
    <Link
      href="/submit"
      className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <PlusIcon className="h-4 w-4" />
      New Request
    </Link>
  );
}
